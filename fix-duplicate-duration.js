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

console.log(`Checking ${nodeFiles.length} files for duplicate duration entries...\n`);

nodeFiles.forEach((filePath, index) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix pattern: duration: Date.now() - startTime,} (missing closing brace)
    content = content.replace(/duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\}/g, '}');
    
    // Fix pattern: } duration: Date.now() - startTime,} (duplicate duration)
    content = content.replace(/\}\s+duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\}/g, '}');
    
    // Fix pattern: duration\n      duration: Date.now() - startTime,} (duplicate in same object)
    content = content.replace(/duration\s*\n\s+duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\}/g, 'duration\n      }');
    
    // Fix pattern: duration\n        duration: Date.now() - startTime,} (duplicate in metadata)
    content = content.replace(/duration\s*\n\s+duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\}/g, 'duration\n        }');
    
    // Fix pattern: duration: Date.now() - startTime,} (standalone duplicate)
    content = content.replace(/duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\}/g, '}');
    
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

