/**
 * Jest setup file for AI Assistant tests
 */

// Add Anthropic SDK shim for Node.js environment
require('@anthropic-ai/sdk/shims/node');

// Mock Parse Server environment
global.Parse = require('parse/node');

// Initialize Parse for testing
Parse.initialize('test-app-id', 'test-js-key', 'test-master-key');
Parse.serverURL = 'http://localhost:1337/parse';

// Mock Parse Cloud functions
Parse.Cloud = {
  define: jest.fn(),
  run: jest.fn(),
  beforeSave: jest.fn(),
  afterSave: jest.fn(),
  beforeDelete: jest.fn(),
  afterDelete: jest.fn(),
  beforeFind: jest.fn(),
  afterFind: jest.fn(),
  beforeLogin: jest.fn(),
  afterLogin: jest.fn(),
  beforeLogout: jest.fn(),
  afterLogout: jest.fn(),
  job: jest.fn(),
  httpRequest: jest.fn()
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment
process.env.NODE_ENV = 'test';
