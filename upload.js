const fs = require('fs');
const path = require('path');
const BaseRest = require('./rest.js');

// Custom upload controller for waline
// Stores images in GitHub repository

module.exports = class extends BaseRest {
  constructor(ctx) {
    super(ctx);
  }

  async indexAction() {
    const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_PATH } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
      return this.json({
        errno: 1,
        errmsg: 'GitHub storage not configured',
      });
    }

    const file = this.file('file');
    if (!file) {
      return this.json({
        errno: 1,
        errmsg: 'No file uploaded',
      });
    }

    try {
      // Read file content
      const content = fs.readFileSync(file.path);
      const ext = path.extname(file.originalFilename || file.name || '.png');
      const filename = `images/${Date.now()}${ext}`;

      // Upload to GitHub
      const resp = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`,
        {
          method: 'PUT',
          headers: {
            accept: 'application/vnd.github.v3+json',
            authorization: `token ${GITHUB_TOKEN}`,
            'user-agent': 'Waline',
          },
          body: JSON.stringify({
            message: 'feat(waline): upload image',
            content: content.toString('base64'),
          }),
        }
      );

      const data = await resp.json();

      if (data.content && data.content.download_url) {
        return this.json({
          errno: 0,
          data: {
            url: data.content.download_url,
            alt: file.originalFilename || file.name || 'uploaded image',
          },
        });
      } else {
        return this.json({
          errno: 1,
          errmsg: data.message || 'Upload failed',
        });
      }
    } catch (err) {
      return this.json({
        errno: 1,
        errmsg: err.message,
      });
    }
  }
};
