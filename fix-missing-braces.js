const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

// Files with known issues from the terminal output
const problemFiles = [
  'core/date-time.node.ts',
  'core/delay.node.ts',
  'core/http-request-enhanced.node.ts',
  'core/json-transform.node.ts',
  'llm/anthropic.node.ts',
  'llm/claude-real.node.ts',
  'llm/claude.node.ts',
  'llm/gemini-real.node.ts',
  'llm/gemini.node.ts',
  'llm/openai.node.ts',
  'logic/condition.node.ts',
  'logic/loop.node.ts',
  'ai/openai-enhanced.node.ts',
  'utility/image-resize.node.ts',
  'utilities/data-processor-enhanced.node.ts',
  'analytics/analytics.node.ts',
  'ai/audio-processor.node.ts',
  'ai/code-generator.node.ts',
  'ai/data-analyzer.node.ts',
  'ai/document-processor.node.ts',
  'ai/email-analyzer.node.ts',
  'ai/image-generator.node.ts',
  'ai/speech-to-text.node.ts',
  'ai/text-analyzer.node.ts',
  'ai/text-to-speech.node.ts',
  'ai/vector-search.node.ts',
  'integrations/email.node.ts',
  'integrations/google-drive-real.node.ts',
  'data/database.node.ts',
  'data/mysql-real.node.ts',
  'data/postgresql-real.node.ts',
  'cloud/aws-s3-real.node.ts'
];

let fixed = 0;
let errors = 0;

console.log(`Checking ${problemFiles.length} problem files...\n`);

problemFiles.forEach((relativeFile, index) => {
  const filePath = path.join(nodesDir, relativeFile);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[${index + 1}/${problemFiles.length}] - ${relativeFile} - File not found`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix 1: Remove extra opening braces in execute method
    content = content.replace(/async execute\([^)]*\):\s*Promise<ExecutionResult>\s*\{\{/g, 'async execute($1): Promise<ExecutionResult> {');
    
    // Fix 2: Find execute method and check for missing closing brace before private methods
    const executeMatch = content.match(/async\s+execute\s*\([^)]*\)\s*:\s*Promise<ExecutionResult>\s*\{/);
    if (executeMatch) {
      const executeStart = content.indexOf(executeMatch[0]);
      const executeBodyStart = executeStart + executeMatch[0].length;
      
      // Find the matching closing brace for execute method
      let braceCount = 1;
      let pos = executeBodyStart;
      let executeEnd = -1;
      
      while (pos < content.length && braceCount > 0) {
        if (content[pos] === '{') braceCount++;
        if (content[pos] === '}') braceCount--;
        if (braceCount === 0) {
          executeEnd = pos;
          break;
        }
        pos++;
      }
      
      if (executeEnd > 0) {
        // Check if there's a private method right after execute that's causing issues
        const afterExecute = content.substring(executeEnd + 1).trim();
        if (afterExecute.startsWith('private')) {
          // Check if there's a missing closing brace
          const beforePrivate = content.substring(0, executeEnd + 1);
          const lastBrace = beforePrivate.lastIndexOf('}');
          const secondLastBrace = beforePrivate.lastIndexOf('}', lastBrace - 1);
          
          // Check if we need to add a closing brace
          const beforeExecute = content.substring(0, executeStart);
          const classStart = beforeExecute.lastIndexOf('class ');
          if (classStart > 0) {
            const classBodyStart = beforeExecute.indexOf('{', classStart);
            let classBraceCount = 1;
            let classPos = classBodyStart + 1;
            
            while (classPos < executeStart && classBraceCount > 0) {
              if (content[classPos] === '{') classBraceCount++;
              if (content[classPos] === '}') classBraceCount--;
              classPos++;
            }
            
            // If class brace count is not balanced, we might have an issue
            // But let's check if execute method is properly closed
            const executeBody = content.substring(executeBodyStart, executeEnd);
            const executeBraceCount = (executeBody.match(/\{/g) || []).length;
            const executeCloseCount = (executeBody.match(/\}/g) || []).length;
            
            if (executeBraceCount !== executeCloseCount) {
              console.log(`[${index + 1}/${problemFiles.length}] ⚠️  ${relativeFile} - Unbalanced braces in execute method`);
            }
          }
        }
      }
    }
    
    // Fix 3: Check for missing closing brace before export default
    const exportMatch = content.match(/export\s+default\s+\w+;/);
    if (exportMatch) {
      const exportPos = content.indexOf(exportMatch[0]);
      const beforeExport = content.substring(0, exportPos).trim();
      
      // Count braces before export
      const openBraces = (beforeExport.match(/\{/g) || []).length;
      const closeBraces = (beforeExport.match(/\}/g) || []).length;
      
      if (openBraces > closeBraces) {
        // Missing closing brace - add it before export
        const missingBraces = openBraces - closeBraces;
        content = beforeExport + '\n'.repeat(missingBraces) + '}\n'.repeat(missingBraces) + content.substring(exportPos);
        console.log(`[${index + 1}/${problemFiles.length}] ✓ Fixed missing ${missingBraces} closing brace(s): ${relativeFile}`);
        fixed++;
      }
    }
    
    // Fix 4: Remove duplicate startTime if it appears right after validation
    content = content.replace(/(\s+throw new Error\([^)]+\);\s*\n\s*)\n\s*const startTime = Date\.now\(\);/g, '$1const startTime = Date.now();');
    
    // Fix 5: Ensure proper structure - check if execute method is followed by private without proper closing
    const executeToPrivate = content.match(/async\s+execute[^}]*\}\s*private/);
    if (executeToPrivate) {
      // This might indicate a missing brace, but let's be careful
      // Actually, this pattern might be fine if execute is properly closed
    }
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      if (!originalContent.includes('export default')) {
        console.log(`[${index + 1}/${problemFiles.length}] ✓ Fixed: ${relativeFile}`);
        fixed++;
      }
    }
  } catch (error) {
    console.error(`[${index + 1}/${problemFiles.length}] ✗ Error fixing ${relativeFile}:`, error.message);
    errors++;
  }
});

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed} files`);
console.log(`Errors: ${errors} files`);

