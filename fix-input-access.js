#!/usr/bin/env node

/**
 * Script to fix context.input access pattern
 * Replaces context.input.property with context.input?.property
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, 'backend 2', 'src', 'nodes');

// Find all node files
function findNodeFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && !file.startsWith('.')) {
      findNodeFiles(filePath, fileList);
    } else if (file.endsWith('.node.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const relativePath = path.relative(BACKEND_DIR, filePath);
  
  // Pattern: context.input.property (without optional chaining)
  // But don't replace if already using optional chaining
  // Also don't replace in comments or strings
  
  // Match context.input. followed by identifier, but not context.input?. 
  const pattern = /context\.input\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
  
  const matches = content.match(pattern);
  if (matches && matches.length > 0) {
    // Check if already has optional chaining nearby (same line)
    const lines = content.split('\n');
    let hasChanges = false;
    
    const newLines = lines.map(line => {
      // Skip comments and strings
      if (line.trim().startsWith('//') || line.includes('//')) {
        const commentIndex = line.indexOf('//');
        const beforeComment = line.substring(0, commentIndex);
        const afterComment = line.substring(commentIndex);
        
        // Only fix before comment
        if (beforeComment.includes('context.input.') && !beforeComment.includes('context.input?.')) {
          hasChanges = true;
          return beforeComment.replace(/context\.input\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'context.input?.$1') + afterComment;
        }
        return line;
      }
      
      // Skip string literals
      if (line.includes('"context.input.') || line.includes("'context.input.")) {
        return line;
      }
      
      // Fix the pattern
      if (line.includes('context.input.') && !line.includes('context.input?.')) {
        hasChanges = true;
        return line.replace(/context\.input\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'context.input?.$1');
      }
      
      return line;
    });
    
    if (hasChanges) {
      content = newLines.join('\n');
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Fixed: ${relativePath}`);
    return true;
  }
  
  return false;
}

// Main
console.log('🔧 Fixing context.input access pattern...\n');

const nodeFiles = findNodeFiles(BACKEND_DIR);
let fixedCount = 0;

nodeFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} out of ${nodeFiles.length} files`);

