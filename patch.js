const fs = require('fs');
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
  } else {
    console.log('adapter.js already patched');
  }
} catch(e) {
  console.log('Patch skipped:', e.message);
}
