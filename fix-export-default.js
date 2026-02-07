const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

// Files with export default issues
const problemFiles = [
  'agent/context.node.ts',
  'agent/decision.node.ts',
  'agent/goal.node.ts',
  'agent/reasoning.node.ts',
  'agent/state.node.ts',
  'ai/audio-processor.node.ts',
  'ai/code-generator.node.ts',
  'llm/claude-real.node.ts',
  'llm/gemini-real.node.ts'
];

let fixed = 0;
let errors = 0;

console.log(`Fixing ${problemFiles.length} files with export default issues...\n`);

problemFiles.forEach((relativeFile, index) => {
  const filePath = path.join(nodesDir, relativeFile);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[${index + 1}/${problemFiles.length}] - ${relativeFile} - File not found`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix 1: Remove extra closing brace before export default
    content = content.replace(/\}\s*\n\s*\}\s*\n\s*export\s+default/g, '}\n\nexport default');
    
    // Fix 2: Fix test methods that are outside class
    // If test method appears after a closing brace but before export default
    const testBeforeExport = content.match(/\}\s*\n\s*\}\s*\n\s*async\s+test\s*\(/);
    if (testBeforeExport) {
      // Remove one closing brace
      content = content.replace(/\}\s*\n\s*\}\s*\n\s*async\s+test\s*\(/g, '}\n\n  async test(');
    }
    
    // Fix 3: Ensure test method is inside class
    const classMatch = content.match(/class\s+\w+/);
    if (classMatch) {
      const classStart = content.indexOf(classMatch[0]);
      const classBodyStart = content.indexOf('{', classStart);
      
      // Find the closing brace of the class
      let braceCount = 1;
      let pos = classBodyStart + 1;
      let classEnd = -1;
      
      while (pos < content.length && braceCount > 0) {
        if (content[pos] === '{') braceCount++;
        if (content[pos] === '}') braceCount--;
        if (braceCount === 0) {
          classEnd = pos;
          break;
        }
        pos++;
      }
      
      if (classEnd > 0) {
        // Check if test method is after class but before export
        const testMatch = content.match(/async\s+test\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>/);
        if (testMatch) {
          const testStart = content.indexOf(testMatch[0]);
          const exportMatch = content.match(/export\s+default/);
          
          if (exportMatch && testStart > classEnd && testStart < content.indexOf(exportMatch[0])) {
            // Test method is outside class - move it inside
            const testMethod = content.substring(testStart, content.indexOf('\n}', testStart) + 2);
            const beforeTest = content.substring(0, testStart);
            const afterTest = content.substring(testStart + testMethod.length);
            
            // Insert test method before class closing brace
            content = content.substring(0, classEnd) + '\n\n  ' + testMethod.trim() + '\n' + content.substring(classEnd);
            
            // Remove test method from outside
            const newTestStart = content.indexOf(testMethod, classEnd);
            if (newTestStart > classEnd) {
              content = content.substring(0, newTestStart) + content.substring(newTestStart + testMethod.length);
            }
          }
        }
      }
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[${index + 1}/${problemFiles.length}] ✓ Fixed: ${relativeFile}`);
      fixed++;
    } else {
      console.log(`[${index + 1}/${problemFiles.length}] - ${relativeFile} - No changes needed`);
    }
  } catch (error) {
    console.error(`[${index + 1}/${problemFiles.length}] ✗ Error fixing ${relativeFile}:`, error.message);
    errors++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Errors: ${errors} files`);

