const Parse = require('parse/node');
const fs = require('fs').promises;
const path = require('path');
const OptimizationService = require('../src/services/OptimizationService');

describe('Optimization System', () => {
  let testUser;
  let testContent;
  let testImage;

  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize('myAppId', 'myJavaScriptKey', 'myMasterKey');
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize Optimization Service
    await OptimizationService.initialize();

    // Create test user
    const user = new Parse.User();
    user.set('username', 'testuser');
    user.set('password', 'testpass');
    user.set('email', 'test@example.com');
    testUser = await user.signUp();

    // Create test image file
    const imageBuffer = await fs.readFile(path.join(__dirname, 'fixtures/test-image.jpg'));
    testImage = new Parse.File('test-image.jpg', [...imageBuffer]);
    await testImage.save();
  });

  beforeEach(async () => {
    // Create test content
    const Content = Parse.Object.extend('Content');
    const content = new Content();
    content.set('title', 'Test Content for SEO');
    content.set(
      'content',
      `
      <h1>Main Title</h1>
      <p>This is a test article about search engine optimization.</p>
      <h2>First Section</h2>
      <p>It contains multiple paragraphs and proper HTML structure.</p>
      <img src="test.jpg" alt="Test Image" />
      <h2>Second Section</h2>
      <p>This helps test the content structure analysis.</p>
      <a href="/internal">Internal Link</a>
      <a href="https://example.com">External Link</a>
    `
    );
    content.set('description', 'A comprehensive test article about SEO optimization');
    content.set('keywords', ['seo', 'optimization', 'testing']);
    content.set('type', 'article');

    testContent = await content.save(null, { useMasterKey: true });
  });

  describe('SEO Analysis', () => {
    it('should analyze content SEO successfully', async () => {
      const params = {
        content: {
          title: testContent.get('title'),
          content: testContent.get('content'),
          description: testContent.get('description'),
          keywords: testContent.get('keywords'),
          type: testContent.get('type'),
        },
      };

      const analysis = await Parse.Cloud.run('analyzeSEO', params);

      expect(analysis).toBeTruthy();
      expect(analysis.keywords).toBeTruthy();
      expect(analysis.meta).toBeTruthy();
      expect(analysis.structure).toBeTruthy();
      expect(analysis.score).toBeGreaterThan(0);
    });

    it('should provide keyword analysis', async () => {
      const params = {
        content: {
          title: testContent.get('title'),
          content: testContent.get('content'),
        },
      };

      const analysis = await Parse.Cloud.run('analyzeSEO', params);

      expect(analysis.keywords.primary).toBeTruthy();
      expect(analysis.keywords.secondary.length).toBeGreaterThan(0);
      expect(analysis.keywords.all.length).toBeGreaterThan(0);
      expect(analysis.keywords.all[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it('should analyze content structure', async () => {
      const params = {
        content: {
          title: testContent.get('title'),
          content: testContent.get('content'),
        },
      };

      const analysis = await Parse.Cloud.run('analyzeSEO', params);

      expect(analysis.structure.headings.h1).toBe(1);
      expect(analysis.structure.headings.h2).toBe(2);
      expect(analysis.structure.links.internal).toBe(1);
      expect(analysis.structure.links.external).toBe(1);
      expect(analysis.structure.images.withAlt).toBe(1);
    });
  });

  describe('Media Optimization', () => {
    it('should optimize image successfully', async () => {
      const params = {
        file: testImage,
        options: {
          type: 'image',
          quality: 80,
          format: 'jpeg',
          width: 800,
        },
      };

      const result = await Parse.Cloud.run('optimizeMedia', params);

      expect(result.file).toBeTruthy();
      expect(result.file.url()).toBeTruthy();

      // Verify optimization
      const originalSize = testImage._data.length;
      const optimizedSize = result.file._data.length;
      expect(optimizedSize).toBeLessThan(originalSize);
    });

    it('should generate thumbnails', async () => {
      const params = {
        file: testImage,
        options: {
          type: 'thumbnail',
          width: 200,
          height: 200,
          format: 'jpeg',
        },
      };

      const result = await Parse.Cloud.run('optimizeMedia', params);

      expect(result.file).toBeTruthy();
      expect(result.file.url()).toBeTruthy();
    });

    it('should handle CDN integration when enabled', async () => {
      // Only test if CDN is configured
      if (OptimizationService.cdnConfig && OptimizationService.cdnConfig.enabled) {
        const params = {
          file: testImage,
          options: {
            type: 'image',
            quality: 80,
            format: 'jpeg',
          },
        };

        const result = await Parse.Cloud.run('optimizeMedia', params);

        expect(result.cdnUrl).toBeTruthy();
        expect(result.cdnUrl).toContain(OptimizationService.cdnConfig.baseUrl);
      }
    });
  });

  describe('Performance Analysis', () => {
    it('should analyze page performance', async () => {
      const params = {
        url: 'http://localhost:1337/test-page',
      };

      const analysis = await Parse.Cloud.run('analyzePerformance', params);

      expect(analysis.performance).toBeTruthy();
      expect(analysis.performance.score).toBeGreaterThanOrEqual(0);
      expect(analysis.performance.metrics).toBeTruthy();
      expect(analysis.resources).toBeTruthy();
    });

    it('should provide optimization suggestions', async () => {
      const params = {
        url: 'http://localhost:1337/test-page',
      };

      const analysis = await Parse.Cloud.run('analyzePerformance', params);

      expect(analysis.resources.suggestions).toBeTruthy();
      expect(Array.isArray(analysis.resources.suggestions)).toBe(true);
    });
  });

  describe('Lazy Loading', () => {
    it('should generate lazy loading code', async () => {
      const params = {
        selector: '.lazy-image',
        src: 'https://example.com/image.jpg',
      };

      const code = await Parse.Cloud.run('generateLazyLoading', params);

      expect(code.html).toBeTruthy();
      expect(code.javascript).toBeTruthy();
      expect(code.html).toContain('lazy-container');
      expect(code.javascript).toContain('IntersectionObserver');
    });
  });

  describe('Automatic Optimization', () => {
    it('should automatically analyze SEO on content save', async () => {
      const Content = Parse.Object.extend('Content');
      const content = new Content();
      content.set('title', 'Auto SEO Test');
      content.set('content', '<p>Test content for automatic SEO analysis.</p>');

      const savedContent = await content.save(null, { useMasterKey: true });

      expect(savedContent.get('seoAnalysis')).toBeTruthy();
      expect(savedContent.get('seoScore')).toBeGreaterThan(0);
    });

    it('should automatically optimize uploaded images', async () => {
      // Upload a new image
      const imageBuffer = await fs.readFile(path.join(__dirname, 'fixtures/test-image.jpg'));
      const file = new Parse.File('auto-optimize.jpg', [...imageBuffer]);
      await file.save();

      // Wait for optimization
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check optimization record
      const query = new Parse.Query('FileOptimization');
      query.equalTo('file', file);
      const optimization = await query.first({ useMasterKey: true });

      expect(optimization).toBeTruthy();
      expect(optimization.get('originalSize')).toBeGreaterThan(optimization.get('optimizedSize'));
    });
  });

  afterEach(async () => {
    // Clean up test data
    const queries = [new Parse.Query('Content'), new Parse.Query('FileOptimization')];

    for (const query of queries) {
      const objects = await query.find({ useMasterKey: true });
      await Parse.Object.destroyAll(objects, { useMasterKey: true });
    }
  });

  afterAll(async () => {
    // Clean up test user and files
    await testUser.destroy({ useMasterKey: true });
    await testImage.destroy({ useMasterKey: true });
  });
});
