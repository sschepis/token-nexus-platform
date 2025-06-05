const express = require('express');
const { ParseServer } = require('parse-server');

const app = express();

const parseServer = new ParseServer({
  databaseURI: 'mongodb://localhost:27017/gemcms',
  appId: 'gemcms_dev',
  masterKey: 'gemcms_master_key_dev',
  serverURL: 'http://localhost:1337/parse',
});

app.use('/parse', parseServer);

app.listen(1337, () => {
  console.log('Parse Server running on port 1337');
});
