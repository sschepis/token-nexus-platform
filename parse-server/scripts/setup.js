/**
 * Development Setup Script
 * Sets up local development environment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  mongodb: {
    port: 27017,
    dbName: 'gemcms_dev',
  },
  elasticsearch: {
    port: 9200,
  },
  redis: {
    port: 6379,
  },
  parseServer: {
    port: 1337,
    appId: 'myAppId',
    masterKey: 'myMasterKey',
    javascriptKey: 'myJavaScriptKey',
  },
  dashboard: {
    port: 4040,
  },
};

// Create .env file
const envContent = `
# Parse Server
PORT=${config.parseServer.port}
PARSE_APP_ID=${config.parseServer.appId}
PARSE_MASTER_KEY=${config.parseServer.masterKey}
PARSE_JAVASCRIPT_KEY=${config.parseServer.javascriptKey}
DATABASE_URI=mongodb://localhost:${config.mongodb.port}/${config.mongodb.dbName}
CLOUD_CODE_MAIN=${path.join(__dirname, '../cloud/main.js')}

# Search
ELASTICSEARCH_URL=http://localhost:${config.elasticsearch.port}

# Cache
REDIS_URL=redis://localhost:${config.redis.port}

# Dashboard
PARSE_DASHBOARD_PORT=${config.dashboard.port}
PARSE_DASHBOARD_APP_NAME=GemCMS
PARSE_DASHBOARD_USER=admin
PARSE_DASHBOARD_PASSWORD=password

# Development
NODE_ENV=development
`;

// Create docker-compose file
const dockerComposeContent = `
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "${config.mongodb.port}:27017"
    volumes:
      - mongodb_data:/data/db

  elasticsearch:
    image: elasticsearch:7.17.9
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "${config.elasticsearch.port}:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  redis:
    image: redis:latest
    ports:
      - "${config.redis.port}:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  elasticsearch_data:
  redis_data:
`;

// Create development configuration
const devConfigContent = `
module.exports = {
  apps: [
    {
      name: 'parse-server',
      script: './index.js',
      watch: ['src', 'cloud'],
      ignore_watch: ['node_modules', 'logs'],
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'parse-dashboard',
      script: './dashboard/index.js',
      watch: ['dashboard'],
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
`;

// Setup script
async function setup() {
  try {
    console.log('Setting up development environment...');

    // Create necessary directories
    ['logs', 'data'].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
    });

    // Write configuration files
    fs.writeFileSync('.env', envContent.trim());
    fs.writeFileSync('docker-compose.yml', dockerComposeContent.trim());
    fs.writeFileSync('ecosystem.config.js', devConfigContent.trim());

    // Install dependencies
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });

    // Install development dependencies
    console.log('Installing development dependencies...');
    execSync('npm install --save-dev nodemon pm2 jest supertest', { stdio: 'inherit' });

    // Start development environment
    console.log('Starting development environment...');
    execSync('docker-compose up -d', { stdio: 'inherit' });

    // Wait for services to be ready
    console.log('Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Initialize Parse Server
    console.log('Initializing Parse Server...');
    execSync('npm run dev', { stdio: 'inherit' });

    console.log('\nDevelopment environment setup complete!');
    console.log('\nAvailable services:');
    console.log(`- Parse Server: http://localhost:${config.parseServer.port}/parse`);
    console.log(`- Parse Dashboard: http://localhost:${config.dashboard.port}`);
    console.log(`- MongoDB: localhost:${config.mongodb.port}`);
    console.log(`- Elasticsearch: http://localhost:${config.elasticsearch.port}`);
    console.log(`- Redis: localhost:${config.redis.port}`);

    console.log('\nDashboard credentials:');
    console.log('Username: admin');
    console.log('Password: password');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setup();
