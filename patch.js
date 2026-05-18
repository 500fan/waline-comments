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

// Remove old upload controller if exists
const controllerDir = path.join(__dirname, 'node_modules/@waline/vercel/src/controller');
const oldController = path.join(controllerDir, 'upload.js');
if (fs.existsSync(oldController)) {
  fs.unlinkSync(oldController);
  console.log('[patch] Removed old upload controller');
}

// Create upload middleware
const middlewareDir = path.join(__dirname, 'node_modules/@waline/vercel/src/middleware');
const uploadMiddlewarePath = path.join(middlewareDir, 'upload.js');

const uploadMiddlewareCode = `
const fs = require('fs');
const path = require('path');

async function ghFetch(token, url, opts = {}) {
  const resp = await fetch(url, {
    ...opts,
    headers: {
      accept: 'application/vnd.github.v3+json',
      authorization: \`token \${token}\`,
      'user-agent': 'Waline',
      ...(opts.headers || {}),
    },
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.message || \`GitHub API \${resp.status}\`);
  return json;
}

module.exports = () => async (ctx, next) => {
  if (ctx.path !== '/api/upload') return next();

  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type');

  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = process.env;

  if (ctx.method === 'GET') {
    const id = ctx.query.id;
    if (!id) {
      ctx.type = 'application/json';
      ctx.body = JSON.stringify({ errno: 1, errmsg: 'Missing id' });
      return;
    }
    try {
      const json = await ghFetch(GITHUB_TOKEN, \`https://api.github.com/repos/\${GITHUB_REPO}/contents/images.json\`);
      const content = Buffer.from(json.content, 'base64').toString('utf-8');
      const images = JSON.parse(content);
      const img = images[id];
      if (!img) {
        ctx.type = 'application/json';
        ctx.body = JSON.stringify({ errno: 1, errmsg: 'Not found' });
        return;
      }
      ctx.type = img.type || 'image/png';
      ctx.body = Buffer.from(img.base64, 'base64');
    } catch (err) {
      ctx.type = 'application/json';
      ctx.body = JSON.stringify({ errno: 1, errmsg: err.message });
    }
    return;
  }

  if (ctx.method === 'POST') {
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      ctx.type = 'application/json';
      ctx.body = JSON.stringify({ errno: 1, errmsg: 'Not configured' });
      return;
    }

    const file = ctx.request.files && (ctx.request.files.file || ctx.request.files.upload || Object.values(ctx.request.files)[0]);
    if (!file) {
      ctx.type = 'application/json';
      ctx.body = JSON.stringify({ errno: 1, errmsg: 'No file' });
      return;
    }

    try {
      const content = fs.readFileSync(file.filepath || file.path);
      const ext = path.extname(file.originalFilename || file.newFilename || '.png').toLowerCase();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
      const type = mimeMap[ext] || 'image/png';

      let images = {};
      let sha = null;
      try {
        const json = await ghFetch(GITHUB_TOKEN, \`https://api.github.com/repos/\${GITHUB_REPO}/contents/images.json\`);
        images = JSON.parse(Buffer.from(json.content, 'base64').toString('utf-8'));
        sha = json.sha;
      } catch (err) {
        if (!err.message.includes('Not Found')) throw err;
      }

      images[id] = {
        name: file.originalFilename || file.newFilename || 'image' + ext,
        type,
        base64: content.toString('base64'),
        time: new Date().toISOString(),
      };

      const writeBody = {
        message: 'feat(waline): update images',
        content: Buffer.from(JSON.stringify(images, null, 2), 'utf-8').toString('base64'),
      };
      if (sha) writeBody.sha = sha;

      await ghFetch(GITHUB_TOKEN, \`https://api.github.com/repos/\${GITHUB_REPO}/contents/images.json\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(writeBody),
      });

      ctx.type = 'application/json';
      ctx.body = JSON.stringify({
        errno: 0,
        data: {
          url: \`https://\${ctx.host}/api/upload?id=\${id}\`,
          alt: file.originalFilename || file.newFilename || 'image',
        },
      });
    } catch (err) {
      ctx.type = 'application/json';
      ctx.body = JSON.stringify({ errno: 1, errmsg: err.message });
    }
    return;
  }

  return next();
};
`;

fs.writeFileSync(uploadMiddlewarePath, uploadMiddlewareCode);
console.log('[patch] Created upload middleware');

// Register upload middleware in middleware config
const middlewareConfigPath = path.join(__dirname, 'node_modules/@waline/vercel/src/config/middleware.js');
let middlewareCode = fs.readFileSync(middlewareConfigPath, 'utf-8');

// Add upload middleware AFTER payload
if (!middlewareCode.includes("'upload'")) {
  const uploadMiddlewareEntry = `
  {
    handle: 'upload',
  },`;
  // Insert after payload block (after the limit: '5mb' line)
  middlewareCode = middlewareCode.replace(
    "limit: '5mb',\n    },\n  },",
    "limit: '5mb',\n    },\n  },\n" + uploadMiddlewareEntry
  );
  fs.writeFileSync(middlewareConfigPath, middlewareCode);
  console.log('[patch] Registered upload middleware after payload');
}
