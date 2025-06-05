/**
 * Jest Configuration
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test files pattern
  testMatch: ['**/tests/**/*.test.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/index.js', '!**/node_modules/**'],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test setup file
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module name mappings
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Display individual test results
  reporters: ['default'],

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Transform files
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/lib/'],
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$'],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/', '/lib/'],

  // Snapshot settings
  snapshotSerializers: [],

  // Error handling
  errorOnDeprecated: true,

  // Cache settings
  cacheDirectory: '.jest-cache',

  // Notification settings
  notify: false,

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests
  forceExit: true,
};
