// Run patch.js first
require('./patch.js');

// Runtime patch: replace comment postAction with simplified version
const fs = require('fs');
const commentPath = require('path').join(__dirname, 'node_modules/@waline/vercel/src/controller/comment.js');
let code = fs.readFileSync(commentPath, 'utf-8');

if (!code.includes('[SIMPLE_POST]')) {
  // Find the postAction method and replace it entirely
  const postStart = code.indexOf('  async postAction() {');
  const postEnd = code.indexOf('\n  async putAction()', postStart);

  if (postStart > -1 && postEnd > -1) {
    const simplePostAction = `  // [SIMPLE_POST] Simplified postAction - skip notify/webhook to avoid hangs
  async postAction() {
    const { comment, link, mail, nick, pid, rid, ua, url } = this.post();
    const data = {
      link, mail, nick, pid, rid, ua, url, comment,
      ip: this.ctx.ip,
      insertedAt: new Date(),
      user_id: '',
      status: 'approved',
    };

    const { userInfo } = this.ctx.state;
    if (userInfo && userInfo.objectId) {
      data.user_id = userInfo.objectId;
    }

    try {
      const resp = await this.modelInstance.add(data);
      return this.success(resp);
    } catch (err) {
      console.error('[SIMPLE_POST] Error:', err.message);
      return this.fail(err.message);
    }
  }
`;
    code = code.substring(0, postStart) + simplePostAction + code.substring(postEnd + 1);
    fs.writeFileSync(commentPath, code);
    console.log('[start.js] Replaced postAction with simplified version');
  } else {
    console.log('[start.js] Could not find postAction boundaries');
  }
}

// Load waline
require('@waline/vercel/vanilla.js');
