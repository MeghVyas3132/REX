const fs = require('fs');
const path = require('path');

const nodesDir = path.join(__dirname, 'backend 2/src/nodes');

// Find all files with the issue
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
  'file-processing/file-validation.node.ts',
  'file-processing/file-upload.node.ts',
  'cloud/docker-real.node.ts',
  'cloud/kubernetes-real.node.ts',
  'cloud/azure-blob-real.node.ts',
  'cloud/aws-lambda-real.node.ts',
  'cloud/google-cloud-storage-real.node.ts'
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
    
    // Remove all "duration: Date.now() - startTime," lines
    // But keep them in execute method catch blocks (they're OK there)
    // We'll remove them from private helper method return statements
    
    // Pattern 1: Remove duration lines that are in return statements of private methods
    // This regex removes lines with "duration: Date.now() - startTime," followed by comma and newline
    content = content.replace(/\s+duration:\s*Date\.now\(\)\s*-\s*startTime,\s*\n/g, '\n');
    
    // Pattern 2: Remove duration lines that are standalone (no trailing comma)
    content = content.replace(/\s+duration:\s*Date\.now\(\)\s*-\s*startTime\s*\n/g, '\n');
    
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

