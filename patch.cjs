const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/USUARIO/Documents/project/al-primera-terminal-manager-main/src/lib/services';

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.ts')) {
      files.push(name);
    }
  }
  return files;
}

const files = getFiles(dir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/supabase\s*\.\s*from\(\s*['\"]([^'\"]+)['\"]\s*\)(?!\s*as\s+any)/g, '(supabase.from(\'$1\') as any)');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  }
}
