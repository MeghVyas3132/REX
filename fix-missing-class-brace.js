const fs = require('fs');
const path = require('path');

const nodesRoot = path.join(__dirname, 'backend 2', 'src', 'nodes');

function listTsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

function balanceBeforeExport(content) {
  const exportMatch = content.match(/\n\s*export\s+default\s+\w+\s*;\s*$/);
  if (!exportMatch) return null;

  const exportIndex = exportMatch.index;
  const before = content.slice(0, exportIndex);

  const opens = (before.match(/\{/g) || []).length;
  const closes = (before.match(/\}/g) || []).length;
  const missing = opens - closes;
  if (missing <= 0) return null;

  const fix = Array(missing).fill('}\n').join('');
  return before + fix + content.slice(exportIndex);
}

function main() {
  const files = listTsFiles(nodesRoot);
  let fixed = 0;
  let examined = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    examined++;
    const updated = balanceBeforeExport(content);
    if (updated && updated !== content) {
      fs.writeFileSync(file, updated, 'utf8');
      console.log(`Fixed missing brace(s): ${path.relative(nodesRoot, file)}`);
      fixed++;
    }
  }

  console.log(`\nExamined: ${examined} files`);
  console.log(`Fixed: ${fixed} files`);
}

main();


