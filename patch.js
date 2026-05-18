const fs = require('fs');
const path = require('path');

// Patch github.js to handle missing content and default GITHUB_PATH
const githubPath = path.join(__dirname, 'node_modules/@waline/vercel/src/service/storage/github.js');

if (fs.existsSync(githubPath)) {
  let code = fs.readFileSync(githubPath, 'utf-8');

  if (code.includes("Buffer.from(resp.content, 'base64')")) {
    code = code.replace(
      "Buffer.from(resp.content, 'base64').toString('utf-8')",
      "(resp.content ? Buffer.from(resp.content, 'base64').toString('utf-8') : '')"
    );
    console.log('[patch] Fixed Buffer.from(undefined) in github.js');
  }

  if (code.includes('this.basePath = GITHUB_PATH;')) {
    code = code.replace(
      'this.basePath = GITHUB_PATH;',
      'this.basePath = GITHUB_PATH || \'\';'
    );
    console.log('[patch] Added default GITHUB_PATH in github.js');
  }

  fs.writeFileSync(githubPath, code);
  console.log('[patch] github.js patched successfully');
}

// Add upload controller for image uploads
const controllerDir = path.join(__dirname, 'node_modules/@waline/vercel/src/controller');
const uploadControllerPath = path.join(controllerDir, 'upload.js');
const uploadSourcePath = path.join(__dirname, 'upload.js');

if (fs.existsSync(uploadSourcePath)) {
  fs.copyFileSync(uploadSourcePath, uploadControllerPath);
  console.log('[patch] Updated upload controller');
}

// Register upload route in router
const routerPath = path.join(__dirname, 'node_modules/@waline/vercel/src/config/router.js');
const routerContent = `module.exports = [
  {
    match: /\\/api\\/upload/,
    controller: 'upload',
    method: 'rest',
  },
];`;
fs.writeFileSync(routerPath, routerContent);
console.log('[patch] Registered upload route');
