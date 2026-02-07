const fs = require('fs');
const path = require('path');

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

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

let fixed = 0;
let errors = 0;

console.log(`Fixing double closing braces in ${problemFiles.length} files...\n`);

problemFiles.forEach((relativeFile, index) => {
  const filePath = path.join(nodesDir, relativeFile);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[${index + 1}/${problemFiles.length}] - ${relativeFile} - File not found`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    const lines = content.split('\n');
    
    // Find consecutive closing braces before export default
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Check if this is export default
      if (line.startsWith('export default')) {
        // Check previous lines for consecutive closing braces
        let braceCount = 0;
        let j = i - 1;
        
        while (j >= 0 && (lines[j].trim() === '}' || lines[j].trim() === '')) {
          if (lines[j].trim() === '}') {
            braceCount++;
          }
          j--;
        }
        
        // If we have more than one closing brace, remove the extra ones
        if (braceCount > 1) {
          // Remove extra closing braces
          const extraBraces = braceCount - 1;
          let removed = 0;
          for (let k = i - 1; k >= 0 && removed < extraBraces; k--) {
            if (lines[k].trim() === '}') {
              lines.splice(k, 1);
              removed++;
            }
          }
          content = lines.join('\n');
          break;
        }
      }
    }
    
    // Also fix: remove extra closing brace before test method
    content = content.replace(/\}\s*\n\s*\}\s*\n\s*async\s+test\s*\(/g, '}\n\n  async test(');
    
    // Fix: remove extra closing brace before export default
    content = content.replace(/\}\s*\n\s*\}\s*\n\s*export\s+default/g, '}\n\nexport default');
    
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

