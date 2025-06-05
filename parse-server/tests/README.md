# Parse Server CMS Tests

This directory contains the test suite for the Parse Server CMS plugin. The tests are organized into
different categories and use Jest as the testing framework.

## Test Categories

### Unit Tests

- Located in individual test files (e.g., `content.test.js`, `media.test.js`)
- Test individual components and functions
- Fast execution, no external dependencies
- Run with: `npm run test:unit`

### Integration Tests

- Located in `integration.test.js`
- Test how different components work together
- Use in-memory MongoDB instance
- Run with: `npm run test:integration`

### Performance Tests

- Located in `performance.test.js`
- Test system performance under various conditions
- Measure response times and resource usage
- Run with: `npm run test:performance`

## Directory Structure

```
tests/
├── fixtures/          # Test data and fixtures
├── setup.js           # Test environment setup
├── helpers.js         # Test helper functions
├── globalSetup.js     # Global setup for all tests
├── globalTeardown.js  # Global teardown for all tests
├── content.test.js    # Content management tests
├── media.test.js      # Media management tests
├── templates.test.js  # Template management tests
├── utils.test.js      # Utility function tests
├── integration.test.js # Integration tests
└── performance.test.js # Performance tests
```

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Suites

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance

# Watch mode (for development)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Test Configuration

Tests can be configured using environment variables or command line arguments:

```bash
# Run tests with specific configuration
NODE_ENV=test npm test

# Run specific test file
npm test -- tests/content.test.js

# Run tests matching description
npm test -- -t "should create content"
```

## Writing Tests

### Test Structure

```javascript
describe('Feature', () => {
  // Setup before all tests
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await teardownTestEnvironment();
  });

  // Reset before each test
  beforeEach(async () => {
    await clearTestData();
  });

  // Test cases
  test('should do something', async () => {
    // Arrange
    const user = await createTestUser();

    // Act
    const result = await someOperation();

    // Assert
    expect(result).toBeDefined();
  });
});
```

### Using Test Helpers

```javascript
const { helpers, Parse } = require('./setup');

// Create test user
const user = await helpers.createUserWithRole('editor');

// Create test content
const content = await helpers.createContent(user, 'blogPost');

// Create test template
const template = await helpers.createTemplate('basicPage');

// Create test media
const media = await helpers.createMedia(user, 'image');
```

### Using Fixtures

```javascript
const fixtures = require('./fixtures/data');

// Use predefined test data
const templateData = fixtures.templates.blogPost;
const contentData = fixtures.content.blogPost;
```

## Test Environment

Tests run in a controlled environment with:

- In-memory MongoDB instance
- Disabled external services
- Controlled random data
- Isolated test cases

### Environment Variables

```bash
NODE_ENV=test            # Test environment
TESTING_TYPE=unit        # Test type (unit, integration, performance)
```

## Best Practices

1. **Test Organization**

   - Group related tests using `describe`
   - Use clear, descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)

2. **Test Independence**

   - Each test should be independent
   - Clean up data between tests
   - Don't rely on test order

3. **Async Testing**

   - Always use async/await
   - Handle promises properly
   - Set appropriate timeouts

4. **Mocking**

   - Mock external services
   - Use Jest mock functions
   - Reset mocks between tests

5. **Performance Testing**
   - Set realistic thresholds
   - Account for environment variations
   - Use appropriate sample sizes

## Debugging Tests

### Using VS Code

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["${relativeFile}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Using Jest CLI

```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Show more details
npm test -- --verbose

# Update snapshots
npm test -- -u
```

## Coverage Reports

Coverage reports are generated in the `coverage` directory:

- `coverage/lcov-report/index.html` - HTML report
- `coverage/clover.xml` - Clover format
- `coverage/coverage-final.json` - JSON format

View coverage with:

```bash
npm run test:coverage
```

## Contributing

1. Write tests for new features
2. Ensure all tests pass
3. Maintain or improve coverage
4. Follow existing patterns
5. Update documentation

## Troubleshooting

Common issues and solutions:

1. **Tests timing out**

   - Increase timeout in jest.config.js
   - Check for infinite loops
   - Verify async operations complete

2. **Memory issues**

   - Run tests in smaller batches
   - Check for memory leaks
   - Increase Node memory limit

3. **Random failures**

   - Check for race conditions
   - Verify test isolation
   - Add debugging logs

4. **Slow tests**
   - Identify slow operations
   - Use appropriate test categories
   - Optimize test setup/teardown
