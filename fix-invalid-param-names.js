const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

// Find all node files
function findNodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      findNodeFiles(filePath, fileList);
    } else if (file.endsWith('.node.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const nodeFiles = findNodeFiles(nodesDir);
let fixed = 0;
let errors = 0;

console.log(`Checking ${nodeFiles.length} files for invalid parameter names in validation...\n`);

nodeFiles.forEach((filePath, index) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Find and fix invalid parameter names in validation checks
    // Pattern: config.Parameter Name with spaces or special chars
    const invalidPattern = /if\s*\(\s*!config\.([A-Z][^&|\s]*\s+[^&|\s]+)\s*&&/g;
    
    // Remove validation lines with invalid parameter names
    content = content.replace(/if\s*\(\s*!config\.([A-Z][^&|\s]*\s+[^&|\s]+)\s*&&\s*!context\.input\?\.\1\s*\)\s*\{[\s\S]*?throw\s+new\s+Error\([^)]*\);\s*\}/g, '');
    
    // Also fix specific patterns
    content = content.replace(/if\s*\(\s*!config\.Speech to Text/g, 'if (false // Invalid param: Speech to Text');
    content = content.replace(/if\s*\(\s*!config\.CSV File/g, 'if (false // Invalid param: CSV File');
    content = content.replace(/if\s*\(\s*!context\.input\?\.Speech to Text/g, 'if (false // Invalid param');
    content = content.replace(/if\s*\(\s*!context\.input\?\.CSV File/g, 'if (false // Invalid param');
    content = content.replace(/if\s*\(\s*!config\.Data Insights/g, 'if (false // Invalid param: Data Insights');
    content = content.replace(/if\s*\(\s*!context\.input\?\.Data Insights/g, 'if (false // Invalid param');
    
    // Remove invalid validation blocks
    const lines = content.split('\n');
    const newLines = [];
    let inInvalidBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is an invalid validation line
      if (line.includes('config.Speech to Text') || 
          line.includes('config.CSV File') || 
          line.includes('config.Data Insights') ||
          line.includes('context.input?.Speech to Text') ||
          line.includes('context.input?.CSV File') ||
          line.includes('context.input?.Data Insights')) {
        // Skip this line and the next few lines (the validation block)
        inInvalidBlock = true;
        continue;
      }
      
      if (inInvalidBlock && (line.trim() === '}' || line.includes('throw new Error'))) {
        inInvalidBlock = false;
        continue;
      }
      
      if (inInvalidBlock && line.trim().startsWith('throw')) {
        inInvalidBlock = false;
        continue;
      }
      
      if (!inInvalidBlock) {
        newLines.push(line);
      }
    }
    
    content = newLines.join('\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[${index + 1}/${nodeFiles.length}] ✓ Fixed: ${path.relative(nodesDir, filePath)}`);
      fixed++;
    }
  } catch (error) {
    console.error(`[${index + 1}/${nodeFiles.length}] ✗ Error checking ${path.relative(nodesDir, filePath)}:`, error.message);
    errors++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Errors: ${errors} files`);

