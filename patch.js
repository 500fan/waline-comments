const fs = require('fs');
const path = require('path');

// Patch github.js to handle missing content and default GITHUB_PATH
const githubPath = path.join(__dirname, 'node_modules/@waline/vercel/src/service/storage/github.js');

if (fs.existsSync(githubPath)) {
  let code = fs.readFileSync(githubPath, 'utf-8');

  // Fix: Buffer.from(resp.content, 'base64') fails when resp.content is undefined
  // This happens when GitHub API returns an error (e.g., file not found)
  if (code.includes("Buffer.from(resp.content, 'base64')")) {
    code = code.replace(
      "Buffer.from(resp.content, 'base64').toString('utf-8')",
      "(resp.content ? Buffer.from(resp.content, 'base64').toString('utf-8') : '')"
    );
    console.log('[patch] Fixed Buffer.from(undefined) in github.js');
  }

  // Fix: Default GITHUB_PATH to empty string if not set
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
