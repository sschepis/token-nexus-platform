const Parse = require('parse/node');
const AIService = require('../src/services/AIService');

describe('AI System', () => {
  let testUser;
  let testContent;

  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize('myAppId', 'myJavaScriptKey', 'myMasterKey');
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize AI Service
    await AIService.initialize();

    // Create test user
    const user = new Parse.User();
    user.set('username', 'testuser');
    user.set('password', 'testpass');
    user.set('email', 'test@example.com');
    testUser = await user.signUp();
  });

  beforeEach(async () => {
    // Create test content
    const Content = Parse.Object.extend('Content');
    const content = new Content();
    content.set('title', 'Test Content for AI Analysis');
    content.set(
      'content',
      'This is a test article about artificial intelligence and machine learning. ' +
        'The content should be long enough to provide meaningful analysis. ' +
        'It should contain multiple paragraphs and cover various aspects of the topic. ' +
        "This will help test the AI service's ability to analyze and optimize content effectively."
    );
    content.set('type', 'article');
    content.set('audience', 'technical');

    testContent = await content.save(null, { useMasterKey: true });
  });

  describe('Content Optimization', () => {
    it('should optimize content successfully', async () => {
      const params = {
        content: {
          title: testContent.get('title'),
          content: testContent.get('content'),
          type: testContent.get('type'),
          audience: testContent.get('audience'),
        },
      };

      const result = await Parse.Cloud.run('optimizeContent', params);

      expect(result).toBeTruthy();
      expect(result.title).toBeTruthy();
      expect(result.readability).toBeTruthy();
      expect(result.seo).toBeTruthy();
      expect(result.engagement).toBeTruthy();
    });

    it('should handle content optimization with minimal content', async () => {
      const params = {
        content: {
          title: 'Short Title',
          content: 'Brief content.',
          type: 'article',
        },
      };

      const result = await Parse.Cloud.run('optimizeContent', params);

      expect(result).toBeTruthy();
      expect(result.readability.score).toBeTruthy();
      expect(result.seo.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Tag Generation', () => {
    it('should generate tags for content', async () => {
      const params = {
        content: {
          title: testContent.get('title'),
          content: testContent.get('content'),
        },
      };

      const tags = await Parse.Cloud.run('generateTags', params);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(tag => tag.includes('ai') || tag.includes('machine-learning'))).toBe(true);
    });

    it('should generate consistent tags for similar content', async () => {
      const params1 = {
        content: {
          title: 'AI in Healthcare',
          content: 'Artificial intelligence applications in healthcare and medicine.',
        },
      };

      const params2 = {
        content: {
          title: 'Healthcare AI',
          content: 'Applications of AI and machine learning in medical field.',
        },
      };

      const tags1 = await Parse.Cloud.run('generateTags', params1);
      const tags2 = await Parse.Cloud.run('generateTags', params2);

      const commonTags = tags1.filter(tag => tags2.includes(tag));
      expect(commonTags.length).toBeGreaterThan(0);
    });
  });

  describe('Content Scheduling', () => {
    it('should provide optimal scheduling recommendations', async () => {
      const params = {
        content: {
          id: testContent.id,
          type: testContent.get('type'),
          audience: testContent.get('audience'),
        },
      };

      const schedule = await Parse.Cloud.run('getOptimalSchedule', params);

      expect(schedule).toBeTruthy();
      expect(Array.isArray(schedule.optimalTimes)).toBe(true);
      expect(schedule.optimalTimes.length).toBeGreaterThan(0);
      schedule.optimalTimes.forEach(time => {
        expect(time.time).toBeTruthy();
        expect(time.confidence).toBeGreaterThan(0);
        expect(time.expectedEngagement).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Suggestions', () => {
    it('should provide content suggestions based on analytics', async () => {
      const params = {
        timeframe: '7d',
        filters: {
          type: 'article',
          audience: 'technical',
        },
      };

      const suggestions = await Parse.Cloud.run('getContentSuggestions', params);

      expect(suggestions).toBeTruthy();
      expect(Array.isArray(suggestions.topics)).toBe(true);
      expect(suggestions.insights).toBeTruthy();
      expect(Array.isArray(suggestions.contentTypes)).toBe(true);
    });
  });

  describe('Automatic Processing', () => {
    it('should automatically add AI metadata on content save', async () => {
      const Content = Parse.Object.extend('Content');
      const content = new Content();
      content.set('title', 'Auto-processed Content');
      content.set('content', 'This content should be automatically processed by AI.');
      content.set('type', 'article');

      const savedContent = await content.save(null, { useMasterKey: true });

      expect(savedContent.get('aiMetadata')).toBeTruthy();
      expect(savedContent.get('tags')).toBeTruthy();
    });

    it('should update AI suggestions based on analytics', async () => {
      // Create analytics event
      const event = new Parse.Object('AnalyticsEvent');
      event.set('type', 'pageView');
      event.set('data', {
        contentId: testContent.id,
        duration: 300,
        engagement: 0.8,
      });

      await event.save(null, { useMasterKey: true });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify content was updated
      const query = new Parse.Query('Content');
      const updatedContent = await query.get(testContent.id, { useMasterKey: true });

      expect(updatedContent.get('aiSuggestions')).toBeTruthy();
    });
  });

  afterEach(async () => {
    // Clean up test content
    const query = new Parse.Query('Content');
    const objects = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(objects, { useMasterKey: true });

    // Clean up analytics events
    const eventsQuery = new Parse.Query('AnalyticsEvent');
    const events = await eventsQuery.find({ useMasterKey: true });
    await Parse.Object.destroyAll(events, { useMasterKey: true });
  });

  afterAll(async () => {
    // Clean up test user
    await testUser.destroy({ useMasterKey: true });
  });
});
