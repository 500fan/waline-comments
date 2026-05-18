const fs = require('fs');
const path = require('path');

// Helper: read images.json from GitHub
async function readImagesJson(token, repo) {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${repo}/contents/images.json`,
      {
        headers: {
          accept: 'application/vnd.github.v3+json',
          authorization: `token ${token}`,
          'user-agent': 'Waline',
        },
      }
    );
    if (resp.status === 404) return { data: {}, sha: null };
    const json = await resp.json();
    const content = Buffer.from(json.content, 'base64').toString('utf-8');
    return { data: JSON.parse(content), sha: json.sha };
  } catch {
    return { data: {}, sha: null };
  }
}

// Helper: write images.json to GitHub
async function writeImagesJson(token, repo, data, sha) {
  const body = {
    message: 'feat(waline): update images',
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
  };
  if (sha) body.sha = sha;

  const resp = await fetch(
    `https://api.github.com/repos/${repo}/contents/images.json`,
    {
      method: 'PUT',
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: `token ${token}`,
        'user-agent': 'Waline',
      },
      body: JSON.stringify(body),
    }
  );
  return resp.json();
}

// Upload controller
module.exports = class extends think.Controller {
  static get _REST() {
    return true;
  }

  constructor(ctx) {
    super(ctx);
  }

  // GET /api/upload?id=xxx - serve image
  async getAction() {
    const { GITHUB_TOKEN, GITHUB_REPO } = process.env;
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return this.json({ errno: 1, errmsg: 'GitHub storage not configured' });
    }

    const id = this.get('id');
    if (!id) return this.json({ errno: 1, errmsg: 'Missing image id' });

    const { data } = await readImagesJson(GITHUB_TOKEN, GITHUB_REPO);
    const img = data[id];
    if (!img) return this.json({ errno: 1, errmsg: 'Image not found' });

    const buffer = Buffer.from(img.base64, 'base64');
    this.ctx.type = img.type || 'image/png';
    this.ctx.body = buffer;
  }

  // POST /api/upload - upload image
  async postAction() {
    const { GITHUB_TOKEN, GITHUB_REPO } = process.env;
    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return this.json({ errno: 1, errmsg: 'GitHub storage not configured' });
    }

    const file = this.file('file');
    if (!file) {
      return this.json({ errno: 1, errmsg: 'No file uploaded' });
    }

    try {
      const content = fs.readFileSync(file.path);
      const ext = path.extname(file.originalFilename || file.name || '.png').toLowerCase();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const mimeMap = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };
      const type = mimeMap[ext] || 'image/png';

      // Read existing images
      const { data: images, sha } = await readImagesJson(GITHUB_TOKEN, GITHUB_REPO);

      // Add new image
      images[id] = {
        name: file.originalFilename || file.name || 'image' + ext,
        type,
        base64: content.toString('base64'),
        time: new Date().toISOString(),
      };

      // Write back
      await writeImagesJson(GITHUB_TOKEN, GITHUB_REPO, images, sha);

      const serverURL = `https://${this.ctx.host}`;
      return this.json({
        errno: 0,
        data: {
          url: `${serverURL}/api/upload?id=${id}`,
          alt: file.originalFilename || file.name || 'uploaded image',
        },
      });
    } catch (err) {
      return this.json({ errno: 1, errmsg: err.message });
    }
  }
};
