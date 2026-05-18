const fs = require('fs');

// 修补 GitHub storage adapter，确保 GITHUB_PATH 有默认值
const githubPath = 'node_modules/@waline/vercel/src/service/storage/github.js';
try {
  let code = fs.readFileSync(githubPath, 'utf8');
  if (!code.includes("GITHUB_PATH = ''")) {
    code = code.replace(
      'GITHUB_PATH } = process.env;',
      "GITHUB_PATH = '', } = process.env;"
    );
    fs.writeFileSync(githubPath, code, 'utf8');
    console.log('Patched github.js: GITHUB_PATH default set');
  } else {
    console.log('github.js already patched');
  }
} catch(e) {
  console.log('Patch github.js skipped:', e.message);
}

// 同时修补 config/adapter.js
const adapterPath = 'node_modules/@waline/vercel/src/config/adapter.js';
try {
  let code = fs.readFileSync(adapterPath, 'utf8');
  if (!code.includes("GITHUB_PATH = ''")) {
    code = code.replace(
      'GITHUB_PATH } = process.env;',
      "GITHUB_PATH = '', } = process.env;"
    );
    fs.writeFileSync(adapterPath, code, 'utf8');
    console.log('Patched adapter.js: GITHUB_PATH default set');
  }
} catch(e) {
  console.log('Patch adapter.js skipped:', e.message);
}
