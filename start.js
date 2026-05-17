// 覆盖 MongoDB 配置，强制启用 SSL
process.env.MONGO_DB = process.env.MONGO_DB || 'waline';
process.env.MONGO_HOST = process.env.MONGO_HOST || 'cluster0.i1u0cfo.mongodb.net';
process.env.MONGO_USER = process.env.MONGO_USER || 'eric';
process.env.MONGO_PASSWORD = process.env.MONGO_PASSWORD || 't0000062516';
process.env.MONGO_AUTHSOURCE = process.env.MONGO_AUTHSOURCE || 'admin';
process.env.MONGO_OPT_SSL = 'true';
process.env.MONGO_OPT_AUTHSOURCE = 'admin';

// 启动 Waline
require('@waline/vercel/vanilla.js');
