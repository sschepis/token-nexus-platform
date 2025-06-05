const Parse = require('parse/node');
const SearchService = require('../src/services/SearchService');

describe('Search System', () => {
  let testUser;
  let testContent;

  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize('myAppId', 'myJavaScriptKey', 'myMasterKey');
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize Search Service
    await SearchService.initialize();

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
    content.set('title', 'Test Content');
    content.set('content', 'This is test content for search functionality');
    content.set('tags', ['test', 'search']);
    content.set('status', 'published');
    content.set('author', {
      id: testUser.id,
      name: 'Test User',
    });

    testContent = await content.save(null, { useMasterKey: true });

    // Wait for indexing
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Document Indexing', () => {
    it('should index a document successfully', async () => {
      const params = {
        type: 'content',
        document: {
          title: 'Another Test Content',
          content: 'This is another test content',
          tags: ['test'],
          status: 'draft',
        },
      };

      const result = await Parse.Cloud.run('indexDocument', params);
      expect(result.success).toBe(true);

      // Verify document was indexed
      const searchResult = await Parse.Cloud.run('search', {
        type: 'content',
        query: 'Another Test Content',
      });

      expect(searchResult.hits.length).toBeGreaterThan(0);
      expect(searchResult.hits[0].title).toBe('Another Test Content');
    });

    it('should automatically index content on save', async () => {
      const Content = Parse.Object.extend('Content');
      const content = new Content();
      content.set('title', 'Auto-indexed Content');
      content.set('content', 'This content should be automatically indexed');
      await content.save(null, { useMasterKey: true });

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify content was indexed
      const searchResult = await Parse.Cloud.run('search', {
        type: 'content',
        query: 'Auto-indexed Content',
      });

      expect(searchResult.hits.length).toBeGreaterThan(0);
      expect(searchResult.hits[0].title).toBe('Auto-indexed Content');
    });
  });

  describe('Search Functionality', () => {
    it('should perform basic search successfully', async () => {
      const params = {
        type: 'content',
        query: 'test content',
      };

      const results = await Parse.Cloud.run('search', params);

      expect(results.total).toBeGreaterThan(0);
      expect(results.hits[0].title).toBe('Test Content');
    });

    it('should support faceted search', async () => {
      const params = {
        type: 'content',
        query: 'test',
        facets: ['tags', 'status'],
      };

      const results = await Parse.Cloud.run('search', params);

      expect(results.facets).toBeTruthy();
      expect(results.facets.tags).toBeTruthy();
      expect(results.facets.status).toBeTruthy();
    });

    it('should apply filters correctly', async () => {
      const params = {
        type: 'content',
        query: 'test',
        filters: {
          status: 'published',
          tags: ['test'],
        },
      };

      const results = await Parse.Cloud.run('search', params);

      expect(results.total).toBeGreaterThan(0);
      results.hits.forEach(hit => {
        expect(hit.status).toBe('published');
        expect(hit.tags).toContain('test');
      });
    });

    it('should support pagination', async () => {
      // Create additional test content
      const Content = Parse.Object.extend('Content');
      const contents = Array.from({ length: 5 }, (_, i) => {
        const content = new Content();
        content.set('title', `Paginated Content ${i + 1}`);
        content.set('content', 'Pagination test content');
        return content;
      });

      await Parse.Object.saveAll(contents, { useMasterKey: true });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const params = {
        type: 'content',
        query: 'Paginated Content',
        page: 1,
        limit: 2,
      };

      const results = await Parse.Cloud.run('search', params);

      expect(results.hits.length).toBe(2);
      expect(results.total).toBeGreaterThan(2);
    });
  });

  describe('Search Suggestions', () => {
    it('should return search suggestions', async () => {
      const params = {
        type: 'content',
        prefix: 'te',
        limit: 5,
      };

      const suggestions = await Parse.Cloud.run('getSearchSuggestions', params);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion.text.toLowerCase()).toContain('te');
      });
    });
  });

  afterEach(async () => {
    // Clean up test content
    const query = new Parse.Query('Content');
    const objects = await query.find({ useMasterKey: true });
    await Parse.Object.destroyAll(objects, { useMasterKey: true });

    // Wait for index updates
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Clean up test user
    await testUser.destroy({ useMasterKey: true });
  });
});
