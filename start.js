// 确保 GITHUB_PATH 不是 undefined
process.env.GITHUB_PATH = process.env.GITHUB_PATH || '';

require('@waline/vercel/vanilla.js');
