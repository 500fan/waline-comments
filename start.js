// 修补 adapter.js 确保 GITHUB_PATH 不是 undefined
const fs = require('fs');
const adapterPath = 'node_modules/@waline/vercel/src/config/adapter.js';

try {
  let code = fs.readFileSync(adapterPath, 'utf8');
  // 确保 GITHUB_PATH 有默认值
  code = code.replace(
    'GITHUB_PATH } = process.env;',
    'GITHUB_PATH = \'\', } = process.env;'
  );
  fs.writeFileSync(adapterPath, code, 'utf8');
  console.log('Patched adapter.js: GITHUB_PATH default set');
} catch(e) {
  console.log('Patch skipped:', e.message);
}

require('@waline/vercel/vanilla.js');
