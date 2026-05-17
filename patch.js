// 修补 @waline/vercel 的 MongoDB adapter，强制启用 SSL
const fs = require('fs');
const adapterPath = 'node_modules/@waline/vercel/src/config/adapter.js';

try {
  let code = fs.readFileSync(adapterPath, 'utf8');
  // 在 mongo options 中添加 ssl: true
  if (!code.includes('ssl: true')) {
    code = code.replace(
      'options: mongoOpt,',
      'options: Object.assign({ssl: true, authSource: process.env.MONGO_AUTHSOURCE || \'admin\'}, mongoOpt),'
    );
    fs.writeFileSync(adapterPath, code, 'utf8');
    console.log('Patched adapter.js: MongoDB SSL enabled');
  } else {
    console.log('adapter.js already patched');
  }
} catch(e) {
  console.error('Patch failed:', e.message);
}
