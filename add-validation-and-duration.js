#!/usr/bin/env node

/**
 * Script to add validation and duration fixes to nodes
 * 1. Adds validation for required parameters
 * 2. Ensures duration is returned in all results
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend 2', 'src', 'nodes');

// Find all node files
function findNodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && !file.startsWith('.')) {
      findNodeFiles(filePath, fileList);
    } else if (file.endsWith('.node.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Extract required parameters from node definition
function extractRequiredParams(content) {
  const requiredParams = [];
  
  // Find parameters array
  const paramsMatch = content.match(/parameters:\s*\[([\s\S]*?)\]/);
  if (!paramsMatch) return requiredParams;
  
  const paramsContent = paramsMatch[1];
  
  // Match each parameter object
  const paramMatches = paramsContent.matchAll(/\{\s*name:\s*['"]([^'"]+)['"][\s\S]*?required:\s*true/g);
  
  for (const match of paramMatches) {
    const paramName = match[1];
    requiredParams.push(paramName);
  }
  
  return requiredParams;
}

// Check if node has validation
function hasValidation(content, paramName) {
  // Check for validation patterns
  const validationPatterns = [
    new RegExp(`if\\s*\\(!\\s*config\\.${paramName}\\s*\\)`, 'g'),
    new RegExp(`if\\s*\\(!\\s*config\\[['"]${paramName}['"]\\]\\s*\\)`, 'g'),
    new RegExp(`if\\s*\\(!\\s*${paramName}\\s*\\)`, 'g'),
    new RegExp(`throw\\s+new\\s+Error.*${paramName}`, 'gi'),
    new RegExp(`Required.*${paramName}`, 'gi')
  ];
  
  return validationPatterns.some(pattern => pattern.test(content));
}

// Check if node returns duration
function hasDurationReturn(content) {
  return content.includes('duration:') && 
         (content.includes('duration: Date.now() - startTime') || 
          content.includes('duration: Date.now() - start'));
}

// Add validation for required parameters
function addValidation(content, requiredParams) {
  // Find execute method start - try multiple patterns
  let executeMatch = content.match(/(async\s+execute\s*\([^)]+\)\s*:\s*Promise<ExecutionResult>\s*\{[\s\S]*?)(const\s+config\s*=\s*node\.data\?\.config\s*\|\|\s*\{\};)/);
  
  if (!executeMatch) {
    // Try with startTime
    executeMatch = content.match(/(async\s+execute\s*\([^)]+\)\s*:\s*Promise<ExecutionResult>\s*\{[\s\S]*?)(const\s+startTime\s*=\s*Date\.now\(\);)/);
  }
  
  if (!executeMatch) {
    // Try with just execute method start
    executeMatch = content.match(/(async\s+execute\s*\([^)]+\)\s*:\s*Promise<ExecutionResult>\s*\{)/);
    if (executeMatch) {
      const before = executeMatch[1];
      const rest = content.substring(executeMatch.index + executeMatch[0].length);
      
      // Check if config is already defined
      let configLine = '';
      if (!rest.includes('const config = node.data?.config || {};')) {
        configLine = '    const config = node.data?.config || {};\n';
      }
      
      // Check if startTime is already defined
      let startTimeLine = '';
      if (!rest.includes('const startTime = Date.now()')) {
        startTimeLine = '    const startTime = Date.now();\n';
      }
      
      // Build validation code for all missing params
      let validationCode = '';
      const missingParams = requiredParams.filter(param => !hasValidation(content, param));
      if (missingParams.length > 0) {
        validationCode += `    // Validation\n`;
        for (const param of missingParams) {
          validationCode += `    if (!config.${param} && !context.input?.${param}) {\n`;
          validationCode += `      throw new Error('Required parameter "${param}" is missing');\n`;
          validationCode += `    }\n`;
        }
      }
      
      if (validationCode || configLine || startTimeLine) {
        return before + '\n' + configLine + startTimeLine + validationCode + rest;
      }
      
      return content;
    }
    return content;
  }
  
  const before = executeMatch[1];
  const after = executeMatch[2];
  const rest = content.substring(executeMatch.index + executeMatch[0].length);
  
  // Check if config is already defined
  let configLine = '';
  if (!before.includes('const config = node.data?.config || {};') && !after.includes('config')) {
    configLine = '    const config = node.data?.config || {};\n';
  }
  
      // Build validation code for all missing params
      let validationCode = '';
      const missingParams = requiredParams.filter(param => !hasValidation(content, param));
      if (missingParams.length > 0) {
        validationCode += `    // Validation\n`;
        for (const param of missingParams) {
          validationCode += `    if (!config.${param} && !context.input?.${param}) {\n`;
          validationCode += `      throw new Error('Required parameter "${param}" is missing');\n`;
          validationCode += `    }\n`;
        }
      }
  
  if (validationCode || configLine) {
    return before + after + '\n' + configLine + validationCode + rest;
  }
  
  return content;
}

// Ensure duration is returned
function ensureDurationReturn(content) {
  // Check if already has duration
  if (hasDurationReturn(content)) {
    return content;
  }
  
  // Find return statements
  const returnPattern = /return\s*\{[\s\S]*?success:\s*(true|false)[\s\S]*?\};/g;
  const matches = [...content.matchAll(returnPattern)];
  
  if (matches.length === 0) return content;
  
  // Check if startTime is defined
  const hasStartTime = content.includes('const startTime = Date.now()');
  if (!hasStartTime) {
    // Add startTime at beginning of execute
    const executeMatch = content.match(/(async\s+execute\s*\([^)]+\)\s*:\s*Promise<ExecutionResult>\s*\{)/);
    if (executeMatch) {
      content = content.substring(0, executeMatch.index + executeMatch[0].length) +
                '\n    const startTime = Date.now();' +
                content.substring(executeMatch.index + executeMatch[0].length);
    }
  }
  
  // Add duration to return statements
  for (const match of matches) {
    const returnStatement = match[0];
    if (!returnStatement.includes('duration')) {
      const newReturn = returnStatement.replace(/return\s*\{/, 'return {\n      duration: Date.now() - startTime,');
      content = content.replace(returnStatement, newReturn);
    }
  }
  
  return content;
}

// Process a single file
function processFile(filePath) {
  const relativePath = path.relative(BACKEND_DIR, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Extract required parameters
  const requiredParams = extractRequiredParams(content);
  
  if (requiredParams.length > 0) {
    // Check if validation exists for at least one required param
    const needsValidation = requiredParams.some(param => !hasValidation(content, param));
    
    if (needsValidation) {
      // Add validation for all missing params
      const missingParams = requiredParams.filter(param => !hasValidation(content, param));
      if (missingParams.length > 0) {
        const newContent = addValidation(content, missingParams);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }
  }
  
  // Ensure duration is returned
  if (!hasDurationReturn(content)) {
    const newContent = ensureDurationReturn(content);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${relativePath}`);
    return true;
  }
  
  return false;
}

// Main
console.log('🔧 Adding validation and duration fixes...\n');

const nodeFiles = findNodeFiles(BACKEND_DIR);
let fixedCount = 0;

nodeFiles.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${nodeFiles.length} files`);

