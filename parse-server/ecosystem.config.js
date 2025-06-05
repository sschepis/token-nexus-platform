module.exports = {
  apps: [
    {
      name: 'parse-server',
      script: './index.js',
      watch: ['src', 'cloud'],
      ignore_watch: ['node_modules', 'logs'],
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'parse-dashboard',
      script: './dashboard/index.js',
      watch: ['dashboard'],
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
