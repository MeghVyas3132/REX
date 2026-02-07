#!/usr/bin/env node

/**
 * Script to fix remaining duration and validation issues
 * 1. Fix nodes using executionTime instead of duration
 * 2. Fix nodes using data instead of output
 * 3. Add validation for required parameters
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

// Fix executionTime to duration
function fixExecutionTime(content) {
  let modified = false;
  
  // Replace executionTime with duration in return statements
  if (content.includes('executionTime')) {
    // Fix variable declarations
    content = content.replace(/const\s+executionTime\s*=\s*Date\.now\(\)\s*-\s*startTime;?/g, 'const duration = Date.now() - startTime;');
    
    // Fix return statements
    content = content.replace(/executionTime:/g, 'duration:');
    
    // Fix in catch blocks
    content = content.replace(/executionTime:\s*Date\.now\(\)\s*-\s*startTime/g, 'duration: Date.now() - startTime');
    
    modified = true;
  }
  
  return { content, modified };
}

// Fix data to output in return statements
function fixDataToOutput(content) {
  let modified = false;
  
  // Replace data: result with output: result in return statements
  if (content.includes('data: result') && content.includes('return')) {
    content = content.replace(/return\s*\{[\s\S]*?data:\s*result([,\s][\s\S]*?)\};/g, (match) => {
      return match.replace(/data:\s*result/, 'output: result');
    });
    modified = true;
  }
  
  return { content, modified };
}

// Process a single file
function processFile(filePath) {
  const relativePath = path.relative(BACKEND_DIR, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix executionTime
  const timeFix = fixExecutionTime(content);
  if (timeFix.modified) {
    content = timeFix.content;
    modified = true;
  }
  
  // Fix data to output
  const outputFix = fixDataToOutput(content);
  if (outputFix.modified) {
    content = outputFix.content;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${relativePath}`);
    return true;
  }
  
  return false;
}

// Main
console.log('🔧 Fixing duration and output issues...\n');

const nodeFiles = findNodeFiles(BACKEND_DIR);
let fixedCount = 0;

nodeFiles.forEach(file => {
  if (processFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${nodeFiles.length} files`);

