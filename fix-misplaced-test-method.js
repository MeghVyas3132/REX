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

function moveTestInsideClass(content) {
  const exportIdx = content.lastIndexOf('export default');
  if (exportIdx === -1) return null;

  // Find a dangling test method before export
  const testStart = content.lastIndexOf('\n  async test(', exportIdx);
  if (testStart === -1) return null;

  // Find the block start '{' of test
  let braceOpen = content.indexOf('{', testStart);
  if (braceOpen === -1 || braceOpen > exportIdx) return null;
  let brace = 1;
  let i = braceOpen + 1;
  while (i < exportIdx && brace > 0) {
    const ch = content[i];
    if (ch === '{') brace++;
    else if (ch === '}') brace--;
    i++;
  }
  if (brace !== 0) return null;
  const testEnd = i; // exclusive

  // Find the insertion point: the last '}' BEFORE testStart (should be class close)
  const insertAt = content.lastIndexOf('}', testStart);
  if (insertAt === -1) return null;

  const testBlock = content.slice(testStart, testEnd);

  const rebuilt =
    content.slice(0, insertAt) +
    testBlock +
    content.slice(insertAt, testStart) +
    content.slice(testEnd);

  return rebuilt;
}

function main() {
  const files = listTsFiles(nodesRoot);
  let fixed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('async test(')) continue;
    const updated = moveTestInsideClass(content);
    if (updated && updated !== content) {
      fs.writeFileSync(file, updated, 'utf8');
      console.log(`Moved test() inside class: ${path.relative(nodesRoot, file)}`);
      fixed++;
    }
  }

  console.log(`Fixed files: ${fixed}`);
}

main();


