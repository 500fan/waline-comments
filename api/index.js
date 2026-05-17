const { Waline } = require('@waline/vercel');

module.exports = Waline({
  database: 'mongodb',
  mongoDB: process.env.MONGO_URI,
});
