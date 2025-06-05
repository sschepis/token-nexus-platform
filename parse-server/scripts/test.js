#!/usr/bin/env node

/**
 * Test Runner Script
 * Runs different types of tests with appropriate configurations
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const configs = {
  unit: {
    testMatch: [
      '**/tests/**/*.test.js',
      '!**/tests/integration.test.js',
      '!**/tests/performance.test.js',
    ],
    testTimeout: 5000,
    maxWorkers: '50%',
  },
  integration: {
    testMatch: ['**/tests/integration.test.js'],
    testTimeout: 30000,
    maxWorkers: '25%',
  },
  performance: {
    testMatch: ['**/tests/performance.test.js'],
    testTimeout: 60000,
    maxWorkers: 1,
  },
  all: {
    testTimeout: 30000,
    maxWorkers: '25%',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'unit';
const additionalArgs = args.slice(1);

// Validate test type
if (!configs[testType]) {
  console.error(`Invalid test type: ${testType}`);
  console.error('Available test types: unit, integration, performance, all');
  process.exit(1);
}

// Build Jest command
const config = configs[testType];
const jestArgs = [
  '--config',
  path.join(__dirname, '../jest.config.js'),
  '--runInBand',
  `--testTimeout=${config.testTimeout}`,
  `--maxWorkers=${config.maxWorkers}`,
];

// Add test match pattern if specified
if (config.testMatch) {
  jestArgs.push('--testMatch', config.testMatch.join('|'));
}

// Add coverage reporting for non-performance tests
if (testType !== 'performance') {
  jestArgs.push('--coverage');
}

// Add any additional arguments
jestArgs.push(...additionalArgs);

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.TESTING_TYPE = testType;

// Print test configuration
console.log('\nRunning tests with configuration:');
console.log('--------------------------------');
console.log(`Test Type: ${testType}`);
console.log(`Timeout: ${config.testTimeout}ms`);
console.log(`Max Workers: ${config.maxWorkers}`);
if (config.testMatch) {
  console.log('Test Match:', config.testMatch.join(', '));
}
console.log('--------------------------------\n');

// Run Jest
const jest = spawn('jest', jestArgs, {
  stdio: 'inherit',
  env: process.env,
});

// Handle process exit
jest.on('exit', code => {
  if (code !== 0) {
    console.error(`\nTests failed with exit code: ${code}`);
    process.exit(code);
  }

  // Print summary for performance tests
  if (testType === 'performance') {
    console.log('\nPerformance Test Summary:');
    console.log('------------------------');
    console.log('Check the test output above for detailed performance metrics.');
    console.log('Consider running tests multiple times to account for variance.');
    console.log('Compare results against established performance baselines.');
  }

  console.log('\nTests completed successfully!\n');
});

// Handle process errors
jest.on('error', error => {
  console.error('\nError running tests:', error);
  process.exit(1);
});

// Handle interrupts
process.on('SIGINT', () => {
  jest.kill('SIGINT');
  process.exit(1);
});

/**
 * Helper Functions
 */

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds % 60}s`;
}

function printResults(results) {
  console.log('\nTest Results:');
  console.log('-------------');
  console.log(`Total Tests: ${results.numTotalTests}`);
  console.log(`Passed: ${results.numPassedTests}`);
  console.log(`Failed: ${results.numFailedTests}`);
  console.log(`Skipped: ${results.numPendingTests}`);
  console.log(`Duration: ${formatDuration(results.startTime - results.endTime)}`);

  if (results.coverageMap) {
    console.log('\nCoverage Summary:');
    console.log('----------------');
    const coverage = results.coverageMap.getCoverageSummary();
    console.log(`Statements: ${coverage.statements.pct}%`);
    console.log(`Branches: ${coverage.branches.pct}%`);
    console.log(`Functions: ${coverage.functions.pct}%`);
    console.log(`Lines: ${coverage.lines.pct}%`);
  }
}

// Export configurations for use in other scripts
module.exports = {
  configs,
  formatDuration,
  printResults,
};
