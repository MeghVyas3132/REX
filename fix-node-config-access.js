#!/usr/bin/env node

/**
 * Script to fix node.config access pattern in all affected files
 * Replaces node.config with node.data?.config || {}
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend 2', 'src', 'nodes');

// Files that need fixing (from audit)
const filesToFix = [
  'ai/huggingface.node.ts',
  'cloud/aws-lambda-real.node.ts',
  'cloud/aws-s3-real.node.ts',
  'cloud/azure-blob-real.node.ts',
  'cloud/docker-real.node.ts',
  'cloud/google-cloud-storage-real.node.ts',
  'cloud/kubernetes-real.node.ts',
  'communication/discord.node.ts',
  'communication/slack.node.ts',
  'communication/telegram.node.ts',
  'communication/whatsapp.node.ts',
  'data/mongodb-real.node.ts',
  'data/mysql-real.node.ts',
  'data/mysql.node.ts',
  'data/postgresql-real.node.ts',
  'data/postgresql.node.ts',
  'development/github.node.ts',
  'file-processing/data-cleaning.node.ts',
  'file-processing/data-transformation.node.ts',
  'file-processing/file-export.node.ts',
  'file-processing/file-extraction.node.ts',
  'file-processing/file-upload.node.ts',
  'file-processing/file-validation.node.ts',
  'file-processing/quality-assurance.node.ts',
  'finance/stripe.node.ts',
  'integrations/google-drive-real.node.ts',
  'llm/claude-real.node.ts',
  'llm/gemini-real.node.ts',
  'utility/filter.node.ts',
  'utility/math.node.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(BACKEND_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Check if already fixed
  if (content.includes('const config = node.data?.config || {};')) {
    console.log(`✓ Already fixed: ${filePath}`);
    return false;
  }
  
  // Pattern 1: Direct destructuring from node.config
  // const { prop1, prop2 } = node.config;
  const pattern1 = /(\s+)(const\s+\{\s*[^}]+)\s*\}\s*=\s*node\.config;/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, (match, indent, destructure) => {
      return `${indent}const config = node.data?.config || {};\n${indent}${destructure}} = config;`;
    });
    modified = true;
  }
  
  // Pattern 2: Multiple destructuring lines
  // const { prop1 } = node.config;
  // const { prop2 } = node.config;
  const pattern2 = /(\s+)(const\s+\{\s*[^}]+)\s*\}\s*=\s*node\.config;/g;
  if (pattern2.test(content)) {
    let configAdded = false;
    content = content.replace(pattern2, (match, indent, destructure) => {
      if (!configAdded) {
        configAdded = true;
        return `${indent}const config = node.data?.config || {};\n${indent}${destructure}} = config;`;
      }
      return `${indent}${destructure}} = config;`;
    });
    modified = true;
  }
  
  // Pattern 3: node.config.property in code
  // Replace node.config.property with config.property (but only if config is already defined)
  // This is safer to do after the above patterns
  if (content.includes('const config = node.data?.config || {};')) {
    content = content.replace(/node\.config\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'config.$1');
    modified = true;
  }
  
  // Pattern 4: node.config in catch blocks
  // Need to handle this carefully - move config declaration outside try block
  if (content.includes('node.config') && content.includes('catch')) {
    // Check if config is already declared at method start
    const executeMatch = content.match(/async execute\([^)]+\)\s*:\s*Promise<ExecutionResult>\s*\{([^]+?)(const\s+startTime\s*=\s*Date\.now\(\))/);
    if (executeMatch && !content.includes('const config = node.data?.config || {};')) {
      // Add config declaration right after startTime
      content = content.replace(/(const\s+startTime\s*=\s*Date\.now\(\);)/g, '$1\n    const config = node.data?.config || {};');
      // Then replace remaining node.config references
      content = content.replace(/node\.config\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'config.$1');
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`⚠️  No changes needed (or pattern not matched): ${filePath}`);
    return false;
  }
}

// Fix all files
console.log('🔧 Fixing node.config access pattern...\n');

let fixedCount = 0;
filesToFix.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${filesToFix.length} files`);

