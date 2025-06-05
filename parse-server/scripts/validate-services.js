/**
 * Service Validation Script
 * Tests each service for proper functionality
 */

const ServiceManager = require('../src/services/ServiceManager');
const config = require('../src/config').defaultConfig;

class ServiceValidator {
  constructor() {
    this.results = {
      services: {},
      overall: 'pending',
    };
  }

  /**
   * Run all validations
   */
  async validateAll() {
    try {
      console.log('Starting service validation...\n');

      // Initialize services
      await this._validateServiceManager();

      // Validate core services
      await this._validateCacheService();
      await this._validateAnalyticsService();
      await this._validateAIService();

      // Validate feature services
      await this._validateMediaManager();
      await this._validateOptimizationService();
      await this._validateContentService();

      // Check overall health
      await this._validateHealthChecks();

      this.results.overall = this._calculateOverallStatus();
      this._printResults();

      // Cleanup
      await ServiceManager.shutdown();
    } catch (error) {
      console.error('Validation failed:', error);
      this.results.overall = 'failed';
      this._printResults();
      process.exit(1);
    }
  }

  /**
   * Validate ServiceManager
   */
  async _validateServiceManager() {
    console.log('Validating ServiceManager...');
    try {
      await ServiceManager.initialize(config);
      this._addResult('ServiceManager', 'passed', 'Successfully initialized');
    } catch (error) {
      this._addResult('ServiceManager', 'failed', error.message);
      throw error; // Critical failure
    }
  }

  /**
   * Validate CacheService
   */
  async _validateCacheService() {
    console.log('Validating CacheService...');
    const cache = ServiceManager.getService('Cache');

    try {
      // Test basic operations
      await cache.set('test-key', 'test-value', 60);
      const value = await cache.get('test-key');
      if (value !== 'test-value') {
        throw new Error('Cache value mismatch');
      }

      // Test expiration
      await cache.set('expire-key', 'expire-value', 1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      const expired = await cache.get('expire-key');
      if (expired !== undefined) {
        throw new Error('Cache expiration failed');
      }

      this._addResult('CacheService', 'passed', 'All operations successful');
    } catch (error) {
      this._addResult('CacheService', 'failed', error.message);
    }
  }

  /**
   * Validate AnalyticsService
   */
  async _validateAnalyticsService() {
    console.log('Validating AnalyticsService...');
    const analytics = ServiceManager.getService('Analytics');

    try {
      // Test event tracking
      await analytics.trackEvent({
        name: 'test_event',
        properties: { test: true },
      });

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 5500));

      // Verify event was processed
      const results = await analytics.getAnalytics({
        timeframe: '5m',
        metrics: ['events'],
      });

      if (!results.data.events) {
        throw new Error('Event tracking failed');
      }

      this._addResult('AnalyticsService', 'passed', 'Event tracking successful');
    } catch (error) {
      this._addResult('AnalyticsService', 'failed', error.message);
    }
  }

  /**
   * Validate AIService
   */
  async _validateAIService() {
    console.log('Validating AIService...');
    const ai = ServiceManager.getService('AI');

    try {
      // Test content optimization
      const result = await ai.optimizeContent({
        title: 'Test Title',
        content: 'This is a test content piece for validation.',
        type: 'article',
      });

      if (!result.suggestions) {
        throw new Error('Content optimization failed');
      }

      this._addResult('AIService', 'passed', 'Content optimization successful');
    } catch (error) {
      this._addResult('AIService', 'failed', error.message);
    }
  }

  /**
   * Validate MediaManager
   */
  async _validateMediaManager() {
    console.log('Validating MediaManager...');
    const media = ServiceManager.getService('Media');

    try {
      // Create test image buffer
      const testBuffer = Buffer.from('Test image data');

      // Test optimization
      const optimized = await media.optimizeAsset(testBuffer, {
        format: 'jpeg',
        quality: 80,
      });

      if (!Buffer.isBuffer(optimized)) {
        throw new Error('Media optimization failed');
      }

      this._addResult('MediaManager', 'passed', 'Asset optimization successful');
    } catch (error) {
      this._addResult('MediaManager', 'failed', error.message);
    }
  }

  /**
   * Validate OptimizationService
   */
  async _validateOptimizationService() {
    console.log('Validating OptimizationService...');
    const optimization = ServiceManager.getService('Optimization');

    try {
      // Test SEO analysis
      const analysis = await optimization.analyzeSEO({
        title: 'Test Page Title',
        content: 'This is a test page content for SEO analysis.',
        type: 'page',
      });

      if (!analysis.score) {
        throw new Error('SEO analysis failed');
      }

      this._addResult('OptimizationService', 'passed', 'SEO analysis successful');
    } catch (error) {
      this._addResult('OptimizationService', 'failed', error.message);
    }
  }

  /**
   * Validate ContentService
   */
  async _validateContentService() {
    console.log('Validating ContentService...');
    const content = ServiceManager.getService('Content');

    try {
      // Test content validation
      const validation = await content.validateContent({
        title: 'Test Content',
        content: 'This is test content.',
        type: 'article',
      });

      if (!validation.isValid) {
        throw new Error('Content validation failed');
      }

      // Test slug generation
      const slug = await content.generateSlug('Test Content');
      if (!slug) {
        throw new Error('Slug generation failed');
      }

      this._addResult('ContentService', 'passed', 'Content operations successful');
    } catch (error) {
      this._addResult('ContentService', 'failed', error.message);
    }
  }

  /**
   * Validate health checks
   */
  async _validateHealthChecks() {
    console.log('Validating health checks...');
    try {
      const health = await ServiceManager.checkHealth();
      if (health.status !== 'ok') {
        throw new Error(`Health check failed: ${health.status}`);
      }
      this._addResult('HealthChecks', 'passed', 'All services healthy');
    } catch (error) {
      this._addResult('HealthChecks', 'failed', error.message);
    }
  }

  /**
   * Add validation result
   */
  _addResult(service, status, message) {
    this.results.services[service] = { status, message };
  }

  /**
   * Calculate overall status
   */
  _calculateOverallStatus() {
    return Object.values(this.results.services).every(result => result.status === 'passed')
      ? 'passed'
      : 'failed';
  }

  /**
   * Print validation results
   */
  _printResults() {
    console.log('\nValidation Results:');
    console.log('==================');

    for (const [service, result] of Object.entries(this.results.services)) {
      const icon = result.status === 'passed' ? '✓' : '✗';
      const color = result.status === 'passed' ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}${icon}\x1b[0m ${service}: ${result.message}`);
    }

    console.log(
      '\nOverall Status:',
      this.results.overall === 'passed' ? '\x1b[32mpassed\x1b[0m' : '\x1b[31mfailed\x1b[0m'
    );
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ServiceValidator();
  validator.validateAll().catch(error => {
    console.error('Validation script failed:', error);
    process.exit(1);
  });
}

module.exports = ServiceValidator;
