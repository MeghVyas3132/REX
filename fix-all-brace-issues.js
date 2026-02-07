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

console.log(`Checking ${nodeFiles.length} files for brace issues...\n`);

nodeFiles.forEach((filePath, index) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix 1: Remove double opening braces in execute method
    content = content.replace(/async\s+execute\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>\s*\{\{/g, (match) => {
      return match.replace('{{', '{');
    });
    
    // Fix 2: Remove extra closing braces before export default
    content = content.replace(/\}\s*\n\s*\}\s*\n\s*export\s+default/g, '}\n\nexport default');
    
    // Fix 3: Fix test methods that are outside class - add missing closing brace
    // Check if test method appears before export default but after a closing brace
    const testMatch = content.match(/\}\s*\n\s*async\s+test\s*\(/);
    if (testMatch) {
      // Check if there's a class before this
      const beforeTest = content.substring(0, content.indexOf(testMatch[0]));
      const classMatch = beforeTest.match(/class\s+\w+/);
      if (classMatch) {
        // Find the last closing brace before test
        const lastBrace = beforeTest.lastIndexOf('}');
        const beforeLastBrace = beforeTest.substring(0, lastBrace);
        
        // Count braces to see if class is properly closed
        const openBraces = (beforeLastBrace.match(/\{/g) || []).length;
        const closeBraces = (beforeLastBrace.match(/\}/g) || []).length;
        
        if (openBraces > closeBraces) {
          // Missing closing brace - add it before test
          content = beforeTest + '}\n\n' + content.substring(content.indexOf(testMatch[0]));
        }
      }
    }
    
    // Fix 4: Fix test methods that reference undefined startTime
    // Find test methods and add startTime if missing
    const testMethodMatch = content.match(/async\s+test\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>\s*\{([\s\S]*?)\n\s*\}/);
    if (testMethodMatch) {
      const testBody = testMethodMatch[1];
      if (testBody.includes('Date.now() - startTime') && !testBody.includes('const startTime')) {
        // Add startTime at the beginning of test method
        const testStart = content.indexOf(testMethodMatch[0]);
        const testBodyStart = testStart + testMethodMatch[0].indexOf('{') + 1;
        content = content.substring(0, testBodyStart) + '\n    const startTime = Date.now();\n    ' + content.substring(testBodyStart);
      }
    }
    
    // Fix 5: Ensure proper structure - if execute method has double brace, fix it
    const executeDoubleBrace = content.match(/async\s+execute[^{]*\{\{/);
    if (executeDoubleBrace) {
      content = content.replace(/async\s+execute[^{]*\{\{/g, (match) => {
        return match.replace('{{', '{');
      });
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[${index + 1}/${nodeFiles.length}] ✓ Fixed: ${path.relative(nodesDir, filePath)}`);
      fixed++;
    }
  } catch (error) {
    console.error(`[${index + 1}/${nodeFiles.length}] ✗ Error fixing ${path.relative(nodesDir, filePath)}:`, error.message);
    errors++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Errors: ${errors} files`);

