const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');
const auditReport = path.join(__dirname, 'NODE_AUDIT_REPORT.json');

// Read audit report to get list of files with duration issues
const auditData = JSON.parse(fs.readFileSync(auditReport, 'utf8'));

// Extract files with duration issues from results
const filesToFix = [];
auditData.results.forEach(result => {
  const hasDuration = result.issues.some(i => i.type === 'DURATION' && i.severity === 'LOW');
  if (hasDuration) {
    filesToFix.push(result.file);
  }
});

let fixed = 0;
let errors = 0;
let skipped = 0;

console.log(`Found ${filesToFix.length} files with duration issues`);
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
    
    // Check if already has duration in return statement
    const returnStatements = content.matchAll(/return\s*\{[\s\S]*?success:\s*(true|false)[\s\S]*?\}/g);
    let hasDurationInReturn = false;
    for (const match of returnStatements) {
      if (match[0].includes('duration:') || match[0].includes('duration')) {
        hasDurationInReturn = true;
        break;
      }
    }
    
    if (hasDurationInReturn) {
      console.log(`[${index + 1}/${filesToFix.length}] ✓ ${relativeFile} - Already has duration`);
      skipped++;
      return;
    }
    
    // Check if execute method exists
    if (!content.includes('async execute')) {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - No execute method`);
      skipped++;
      return;
    }
    
    // Find execute method start
    const executeMatch = content.match(/async\s+execute\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>\s*\{/);
    if (!executeMatch) {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - Could not find execute method`);
      skipped++;
      return;
    }
    
    // Check if startTime is already declared
    const executeStart = content.indexOf(executeMatch[0]);
    const first100Chars = content.substring(executeStart, executeStart + 200);
    
    let hasStartTime = first100Chars.includes('const startTime') || first100Chars.includes('let startTime');
    
    // Add startTime if missing
    if (!hasStartTime) {
      // Find where to insert (after config declaration if exists, otherwise at start of execute)
      const configPattern = /const\s+config\s*=\s*node\.data\?\s*\.\s*config\s*\|\|\s*\{\};/;
      const configMatch = content.substring(executeStart).match(configPattern);
      
      if (configMatch) {
        const insertIndex = executeStart + content.substring(executeStart).indexOf(configMatch[0]) + configMatch[0].length;
        content = content.substring(0, insertIndex) + '\n    const startTime = Date.now();\n' + content.substring(insertIndex);
      } else {
        // Insert right after execute method opening brace
        const insertIndex = executeStart + executeMatch[0].length;
        content = content.substring(0, insertIndex) + '\n    const startTime = Date.now();\n    ' + content.substring(insertIndex);
      }
      hasStartTime = true;
    }
    
    // Find return statements and add duration
    // Look for return { success: true, ... } or return { success: false, ... }
    const returnPattern = /return\s*\{[\s\S]*?success:\s*(true|false)[\s\S]*?\};?/g;
    let match;
    let modified = false;
    
    while ((match = returnPattern.exec(content)) !== null) {
      const returnStatement = match[0];
      const returnIndex = match.index;
      
      // Check if duration is already in this return statement
      if (returnStatement.includes('duration:')) {
        continue;
      }
      
      // Check if this is in execute method (not in a helper method)
      const beforeReturn = content.substring(0, returnIndex);
      const lastExecute = beforeReturn.lastIndexOf('async execute');
      const lastPrivate = beforeReturn.lastIndexOf('private async');
      const lastFunction = Math.max(beforeReturn.lastIndexOf('async '), beforeReturn.lastIndexOf('function '));
      
      // Only modify if it's in execute method or main scope
      if (lastPrivate === -1 || lastExecute > lastPrivate) {
        // Add duration before closing brace
        let newReturn = returnStatement;
        if (newReturn.includes('success:')) {
          // Insert duration after success or before closing brace
          newReturn = newReturn.replace(/(\s+)(\}[\s;]*)$/, (match, indent, closing) => {
            return indent + 'duration: Date.now() - startTime,' + closing;
          });
          
          if (newReturn !== returnStatement) {
            content = content.substring(0, returnIndex) + newReturn + content.substring(returnIndex + returnStatement.length);
            modified = true;
            // Reset regex lastIndex since content changed
            returnPattern.lastIndex = 0;
          }
        }
      }
    }
    
    if (modified || !hasStartTime) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[${index + 1}/${filesToFix.length}] ✓ Fixed: ${relativeFile}`);
      fixed++;
    } else {
      console.log(`[${index + 1}/${filesToFix.length}] - ${relativeFile} - Already has duration or no changes needed`);
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

