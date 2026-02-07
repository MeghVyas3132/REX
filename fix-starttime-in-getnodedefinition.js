const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

// Files that need fixing (from the error log)
const filesToFix = [
  'agent/context.node.ts',
  'agent/reasoning.node.ts',
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
    
    // Remove the line "duration: Date.now() - startTime," from getNodeDefinition
    // Pattern: find "return {" followed by "duration: Date.now() - startTime," and remove it
    content = content.replace(
      /(getNodeDefinition\(\)\s*\{\s*return\s*\{)\s*duration:\s*Date\.now\(\)\s*-\s*startTime,\s*/g,
      '$1\n      '
    );
    
    // Also try matching with different whitespace
    content = content.replace(
      /(\s+)duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\n(\s+)id:/,
      '$1id:'
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

