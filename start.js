// Run patch.js first
require('./patch.js');

// Additional runtime patch: wrap comment postAction post-save in try-catch
const fs = require('fs');
const commentPath = require('path').join(__dirname, 'node_modules/@waline/vercel/src/controller/comment.js');
let commentCode = fs.readFileSync(commentPath, 'utf-8');

if (!commentCode.includes('[RUNTIME_PATCHED]')) {
  const marker = "think.logger.debug(`Comment have been added to storage.`);";
  const markerIdx = commentCode.indexOf(marker);
  if (markerIdx > -1) {
    const insertPoint = markerIdx + marker.length;
    commentCode =
      commentCode.substring(0, insertPoint) +
      "\n    try { // [RUNTIME_PATCHED]" +
      commentCode.substring(insertPoint);

    const putActionIdx = commentCode.indexOf("async putAction()", markerIdx);
    if (putActionIdx > -1) {
      const lastReturn = commentCode.lastIndexOf("return this.success(", putActionIdx);
      const lastSemicolon = commentCode.indexOf(");", lastReturn);
      const afterSemicolon = commentCode.indexOf("\n", lastSemicolon) + 1;

      commentCode =
        commentCode.substring(0, afterSemicolon) +
        `    } catch (runtimeErr) {\n      console.error('[RUNTIME_PATCHED] Post-save error:', runtimeErr.message);\n      return this.success(resp);\n    }\n` +
        commentCode.substring(afterSemicolon);

      fs.writeFileSync(commentPath, commentCode);
      console.log('[start.js] Comment controller runtime-patched');
    }
  }
}

// Load waline
require('@waline/vercel/vanilla.js');
