const express = require('express');
const { Waline } = require('@waline/server');

const app = express();

app.use(Waline({
  database: 'mongodb',
  mongoDB: process.env.MONGO_URI,
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Waline server running on port ${port}`);
});
