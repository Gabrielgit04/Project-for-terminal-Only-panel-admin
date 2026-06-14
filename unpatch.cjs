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
  
  // Revert (supabase.from('...') as any) -> supabase.from('...')
  content = content.replace(/\(supabase\s*\.\s*from\(\s*(['\"].*?['\"])\s*\)\s*as\s+any\)/g, 'supabase.from($1)');
  
  // Revert explicit : any
  content = content.replace(/\(r:\s*any\)/g, '(r)');
  content = content.replace(/\(u:\s*any\)/g, '(u)');
  content = content.replace(/\(v:\s*any\)/g, '(v)');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Unpatched', file);
  }
}
