module.exports = {
  apps: [
    {
      name: 'parse-server',
      script: './index.js',
      watch: ['src', 'cloud'],
      ignore_watch: ['node_modules', 'logs'],
      env: {
        NODE_ENV: 'development',
        PARSE_APP_ID: 'gemcms_dev',
        PARSE_JAVASCRIPT_KEY: 'YOUR_JAVASCRIPT_KEY', // This is still missing a default in config.js
        PARSE_MASTER_KEY: 'gemcms_master_key_dev',
        PARSE_SERVER_URL: 'http://localhost:1337/parse',
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
