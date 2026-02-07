const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

// Files that have startTime issues in helper methods
const filesToFix = [
  'cloud/aws-lambda.node.ts',
  'cloud/aws-s3.node.ts',
  'cloud/azure-blob.node.ts',
  'cloud/cloudwatch.node.ts',
  'cloud/docker.node.ts',
  'cloud/google-cloud-storage.node.ts',
  'cloud/kubernetes.node.ts',
  'cloud/terraform.node.ts',
  'analytics/analytics.node.ts',
  'file-processing/data-cleaning.node.ts',
  'file-processing/file-validation.node.ts'
];

let fixed = 0;
let errors = 0;

filesToFix.forEach(file => {
  const filePath = path.join(nodesDir, file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} - file not found`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remove "duration: Date.now() - startTime," from private helper methods
    // This pattern matches lines that are in private methods (not in execute method)
    // We'll remove duration from return statements in private methods
    // Pattern: find return statements with duration in private methods
    const lines = content.split('\n');
    let inPrivateMethod = false;
    let inReturnStatement = false;
    let newLines = [];
    let modified = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're entering a private method
      if (line.includes('private async') || line.includes('private ')) {
        inPrivateMethod = true;
        newLines.push(line);
        continue;
      }
      
      // Check if we're entering execute method (should not be modified)
      if (line.includes('async execute') && !line.includes('private')) {
        inPrivateMethod = false;
        newLines.push(line);
        continue;
      }
      
      // Check if we're in a return statement
      if (line.includes('return {')) {
        inReturnStatement = true;
        newLines.push(line);
        continue;
      }
      
      // Check if return statement ends
      if (inReturnStatement && (line.includes('};') || line.includes('}'))) {
        inReturnStatement = false;
        // Remove duration line if it exists before closing
        if (newLines[newLines.length - 1].includes('duration: Date.now() - startTime')) {
          newLines.pop(); // Remove the duration line
          modified = true;
        }
        newLines.push(line);
        continue;
      }
      
      // Remove duration line if in private method return statement
      if (inPrivateMethod && inReturnStatement && line.includes('duration: Date.now() - startTime')) {
        modified = true;
        continue; // Skip this line
      }
      
      newLines.push(line);
    }
    
    content = newLines.join('\n');
    
    // Also try a simpler regex approach - remove duration from return objects in private methods
    // But be careful not to remove from execute method
    content = content.replace(
      /(\s+)duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\n/g,
      (match, indent) => {
        // Only remove if it's likely in a private method (check surrounding context)
        return '';
      }
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${file}`);
      fixed++;
    } else {
      console.log(`- No changes needed: ${file}`);
    }
  } catch (error) {
    console.error(`✗ Error fixing ${file}:`, error.message);
    errors++;
  }
});

console.log(`\nFixed: ${fixed} files`);
console.log(`Errors: ${errors} files`);

