#!/usr/bin/env node

/**
 * REX Import Path Updater
 * Updates import paths in migrated files to use @rex/* packages
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = '/Users/meghvyas/Desktop/REX';

// Import path mappings
const IMPORT_MAPPINGS = [
  // Types imports
  {
    pattern: /from\s+['"]\.\.\/\.\.\/utils\/types['"]/g,
    replacement: "from '@rex/shared'"
  },
  {
    pattern: /from\s+['"]\.\.\/utils\/types['"]/g,
    replacement: "from '@rex/shared'"
  },
  {
    pattern: /from\s+['"]\.\.\/\.\.\/\.\.\/utils\/types['"]/g,
    replacement: "from '@rex/shared'"
  },
  // Logger imports (keep local for now)
  {
    pattern: /const\s+logger\s*=\s*require\(['"]\.\.\/\.\.\/utils\/logger['"]\)/g,
    replacement: "// TODO: Replace with proper logger\nconst logger = console"
  },
  {
    pattern: /const\s+logger\s*=\s*require\(['"]\.\.\/utils\/logger['"]\)/g,
    replacement: "// TODO: Replace with proper logger\nconst logger = console"
  }
];

function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const mapping of IMPORT_MAPPINGS) {
    if (mapping.pattern.test(content)) {
      content = content.replace(mapping.pattern, mapping.replacement);
      modified = true;
    }
    // Reset regex lastIndex
    mapping.pattern.lastIndex = 0;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  Updated: ${path.relative(ROOT_DIR, filePath)}`);
    return true;
  }
  return false;
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      callback(filePath);
    }
  }
}

console.log('==================================');
console.log('  REX Import Path Updater');
console.log('==================================');
console.log('');

const nodesDir = path.join(ROOT_DIR, 'nodes');
let updatedCount = 0;

console.log('Updating imports in nodes/ directory...');
walkDir(nodesDir, (filePath) => {
  if (updateImports(filePath)) {
    updatedCount++;
  }
});

console.log('');
console.log(`Updated ${updatedCount} files.`);
console.log('');
console.log('Note: Some imports may need manual review.');
console.log('Check for:');
console.log('  - Backend-specific imports (prisma, redis, etc.)');
console.log('  - Service imports that should not be in nodes');
console.log('');
