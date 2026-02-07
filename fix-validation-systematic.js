const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');
const auditReport = path.join(__dirname, 'NODE_AUDIT_REPORT.json');

// Read audit report to get list of files with validation issues
const auditData = JSON.parse(fs.readFileSync(auditReport, 'utf8'));

// Extract files with validation issues from results
const filesToFix = [];
auditData.results.forEach(result => {
  const hasValidation = result.issues.some(i => i.type === 'VALIDATION' && i.severity === 'MEDIUM');
  if (hasValidation) {
    filesToFix.push(result.file);
  }
});

let fixed = 0;
let errors = 0;
let skipped = 0;

console.log(`Found ${filesToFix.length} files with validation issues`);
console.log('Starting systematic fix...\n');

filesToFix.forEach((relativeFile, index) => {
  const filePath = path.join(nodesDir, relativeFile);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[${index + 1}/${filesToFix.length}] Skipping ${relativeFile} - file not found`);
      skipped++;
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Check if file already has validation
    if (content.includes('Required parameter') && content.includes('is missing')) {
      console.log(`[${index + 1}/${filesToFix.length}] ✓ ${relativeFile} - Already has validation`);
      skipped++;
      return;
    }
    
    // Extract required parameters from getNodeDefinition
    const getNodeDefinitionMatch = content.match(/getNodeDefinition\(\)\s*\{[\s\S]*?return\s*\{[\s\S]*?parameters:\s*\[([\s\S]*?)\],/);
    if (!getNodeDefinitionMatch) {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - Could not find parameters`);
      skipped++;
      return;
    }
    
    const parametersSection = getNodeDefinitionMatch[1];
    const requiredParams = [];
    
    // Find all required parameters - extract actual parameter names (not display names)
    const paramMatches = parametersSection.matchAll(/\{\s*name:\s*['"]([^'"]+)['"][\s\S]*?required:\s*true/g);
    for (const match of paramMatches) {
      const paramName = match[1];
      // Only add if it's a valid JavaScript identifier (no spaces, starts with letter/underscore)
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(paramName)) {
        requiredParams.push(paramName);
      }
    }
    
    if (requiredParams.length === 0) {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - No required parameters found`);
      skipped++;
      return;
    }
    
    // Find execute method
    const executeMatch = content.match(/async\s+execute\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>\s*\{([\s\S]*?)\n\s*\}/);
    if (!executeMatch) {
      // Try alternative pattern
      const executeMatch2 = content.match(/async\s+execute\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>\s*\{([\s\S]*?)(?=\n\s*\}|$)/);
      if (!executeMatch2) {
        console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - Could not find execute method`);
        skipped++;
        return;
      }
    }
    
    // Find where to insert validation (after config declaration)
    const configPattern = /const\s+config\s*=\s*node\.data\?\s*\.\s*config\s*\|\|\s*\{\};/;
    const configMatch = content.match(configPattern);
    
    if (!configMatch) {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - Could not find config declaration`);
      skipped++;
      return;
    }
    
    // Check if validation already exists after config
    const configIndex = content.indexOf(configMatch[0]);
    const afterConfig = content.substring(configIndex + configMatch[0].length, configIndex + configMatch[0].length + 1000);
    
    // Check for various validation patterns
    const hasValidation = afterConfig.includes('Required parameter') || 
                         afterConfig.includes('is missing') ||
                         afterConfig.includes('throw new Error') && afterConfig.includes('required') ||
                         afterConfig.includes('Validation') && afterConfig.includes('required');
    
    if (hasValidation) {
      console.log(`[${index + 1}/${filesToFix.length}] ✓ ${relativeFile} - Already has validation`);
      skipped++;
      return;
    }
    
    // Generate validation code
    let validationCode = '\n    \n    // Validation for required parameters\n';
    requiredParams.forEach(param => {
      validationCode += `    if (!config.${param} && !context.input?.${param}) {\n`;
      validationCode += `      throw new Error('Required parameter "${param}" is missing');\n`;
      validationCode += `    }\n`;
    });
    
    // Insert validation after config declaration, but before startTime if it exists
    const insertIndex = configIndex + configMatch[0].length;
    
    // Check if startTime is right after config - if so, insert before it
    const nextLines = content.substring(insertIndex, insertIndex + 100);
    const startTimeMatch = nextLines.match(/^\s*const\s+startTime\s*=\s*Date\.now\(\);/);
    
    if (startTimeMatch) {
      // Insert validation before startTime
      const startTimeIndex = insertIndex + nextLines.indexOf(startTimeMatch[0]);
      content = content.substring(0, startTimeIndex) + validationCode + content.substring(startTimeIndex);
    } else {
      // Insert validation after config
      content = content.substring(0, insertIndex) + validationCode + content.substring(insertIndex);
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[${index + 1}/${filesToFix.length}] ✓ Fixed: ${relativeFile} (${requiredParams.length} validations)`);
      fixed++;
    } else {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - No changes made`);
      skipped++;
    }
  } catch (error) {
    console.error(`[${index + 1}/${filesToFix.length}] ✗ Error fixing ${relativeFile}:`, error.message);
    errors++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Skipped: ${skipped} files`);
console.log(`Errors: ${errors} files`);

