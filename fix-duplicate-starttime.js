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

console.log(`Checking ${nodeFiles.length} files for duplicate startTime declarations...\n`);

nodeFiles.forEach((filePath, index) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Find all startTime declarations in execute method
    const executeStart = content.indexOf('async execute');
    if (executeStart === -1) return;
    
    // Find the execute method body
    const executeBodyStart = content.indexOf('{', executeStart);
    const executeBodyEnd = content.lastIndexOf('}');
    
    if (executeBodyStart === -1 || executeBodyEnd === -1) return;
    
    const executeBody = content.substring(executeBodyStart, executeBodyEnd);
    const startTimeMatches = [...executeBody.matchAll(/const\s+startTime\s*=\s*Date\.now\(\);/g)];
    
    let modified = false;
    
    // If there are multiple startTime declarations, keep only the first one
    if (startTimeMatches.length > 1) {
        // Remove all but the first - work backwards
        let newBody = executeBody;
        for (let i = startTimeMatches.length - 1; i > 0; i--) {
          const match = startTimeMatches[i];
          const startPos = match.index;
          const endPos = startPos + match[0].length;
          
          // Find the line and remove it
          const beforeMatch = newBody.substring(0, startPos);
          const afterMatch = newBody.substring(endPos);
          
          // Remove the line (including newline before if exists)
          const beforeTrimmed = beforeMatch.trimEnd();
          if (beforeTrimmed.endsWith('\n') || beforeTrimmed.endsWith('\r')) {
            newBody = beforeTrimmed + afterMatch;
          } else {
            // Remove the entire line including newline
            const linesBefore = beforeMatch.split('\n');
            const lastLine = linesBefore[linesBefore.length - 1];
            if (lastLine.trim() === '') {
              newBody = beforeMatch.replace(/\n\s*$/, '') + '\n' + afterMatch;
            } else {
              newBody = beforeMatch + afterMatch;
            }
          }
        }
        
        content = content.substring(0, executeBodyStart + 1) + newBody + content.substring(executeBodyEnd);
        modified = true;
      }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[${index + 1}/${nodeFiles.length}] ✓ Fixed duplicate startTime: ${path.relative(nodesDir, filePath)}`);
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

