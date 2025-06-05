# Getting Started Guide

## Prerequisites

- Node.js 14+ installed
- MongoDB 4.4+ installed and running
- Redis installed and running (for caching)
- OpenAI API key (for AI service)
- AWS credentials (for media storage)

## Initial Setup

1. Clone the repository:

```bash
git clone [repository-url]
cd gemcms
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```
DATABASE_URI=mongodb://localhost:27017/gemcms
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_api_key
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_BUCKET=your_bucket
```

## Development Workflow

1. Check your assigned tasks in `implementation-tasks.md`

2. Create a new branch for your task:

```bash
git checkout -b feature/[task-name]
```

3. Run the development server:

```bash
npm run dev
```

4. Run tests:

```bash
npm test
```

## Service Validation

Use the validation script to test your service implementation:

```bash
# Run validation for all services
npm run validate-services

# Run validation for specific service
npm run validate-services -- --service=Cache
```

### Validation Script Options

- `--service=[name]`: Test specific service
- `--verbose`: Show detailed output
- `--skip-cleanup`: Skip cleanup after validation

## Service Implementation Guide

1. **Extend BaseService**

```javascript
const BaseService = require('./BaseService');

class MyService extends BaseService {
  constructor() {
    super('MyService');
  }

  async _initializeService(options) {
    // Initialize your service
  }
}
```

2. **Register Dependencies**

```javascript
async _initializeService(options) {
  const DependencyService = require('./DependencyService');
  this.registerDependency('dependency', DependencyService);
}
```

3. **Add Cleanup Handlers**

```javascript
async _initializeService(options) {
  this.registerCleanup(async () => {
    // Cleanup resources
  });
}
```

4. **Implement Error Handling**

```javascript
async myMethod() {
  try {
    // Your code
  } catch (error) {
    throw this.handleError(error, 'operation name');
  }
}
```

## Testing

1. **Unit Tests**

```javascript
describe('MyService', () => {
  let service;

  beforeEach(async () => {
    service = new MyService();
    await service.initialize();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  it('should perform operation', async () => {
    const result = await service.myOperation();
    expect(result).toBeDefined();
  });
});
```

2. **Integration Tests**

```javascript
describe('MyService Integration', () => {
  beforeAll(async () => {
    await ServiceManager.initialize();
  });

  afterAll(async () => {
    await ServiceManager.shutdown();
  });

  it('should work with other services', async () => {
    const service = ServiceManager.getService('MyService');
    const result = await service.operationWithDependencies();
    expect(result).toBeDefined();
  });
});
```

## Common Issues & Solutions

### 1. Service Initialization Failed

```
Error: Service is not initialized
```

- Ensure all required environment variables are set
- Check if dependencies are running (MongoDB, Redis)
- Verify service initialization order

### 2. Dependency Injection Error

```
Error: Dependency not registered
```

- Register dependencies in \_initializeService
- Check dependency service is available
- Verify initialization order in ServiceManager

### 3. Cache Issues

```
Error: Cache operation failed
```

- Verify Redis is running
- Check cache configuration
- Ensure proper error handling

## Code Review Guidelines

1. **Service Implementation**

- Extends BaseService
- Proper dependency registration
- Error handling implementation
- Resource cleanup handlers
- Documentation

2. **Testing**

- Unit tests coverage
- Integration tests
- Error scenarios
- Performance tests

3. **Code Quality**

- ESLint compliance
- TypeScript types (if used)
- Documentation
- Error handling

## Deployment

1. **Development**

```bash
npm run dev
```

2. **Staging**

```bash
npm run deploy:staging
```

3. **Production**

```bash
npm run deploy:production
```

## Monitoring

1. **Service Health**

```bash
curl http://localhost:1337/health
```

2. **Logs**

```bash
npm run logs
```

3. **Metrics Dashboard**

```bash
npm run metrics
```

## Support

- Team Lead: [Name] - [email]
- Backend Lead: [Name] - [email]
- DevOps: [Name] - [email]

## Additional Resources

- [Architecture Documentation](./docs/architecture/service-layer.md)
- [API Documentation](./docs/api/README.md)
- [Deployment Guide](./docs/deployment/README.md)
- [Testing Guide](./docs/testing/README.md)
