const concurrently = require('concurrently');

// Run both Parse Server and Dashboard in development mode
concurrently(
  [
    {
      command: 'nodemon index.js',
      name: 'parse-server',
      prefixColor: 'blue',
    },
    {
      command: 'cd dashboard && npm start',
      name: 'dashboard',
      prefixColor: 'green',
    },
  ],
  {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    restartTries: 3,
  }
);
