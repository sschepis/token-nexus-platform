const queryOptimizer = require('../src/utils/queryOptimizer');
const queryOptimizationMiddleware = require('../src/middleware/queryOptimizationMiddleware');

describe('Query Optimization', () => {
  let mockQuery;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset query optimizer state
    queryOptimizer.queryStats.clear();
    queryOptimizer.indexSuggestions.clear();

    // Mock Parse Query
    mockQuery = {
      _where: { field: 'value' },
      _order: ['createdAt'],
      _skip: 0,
      _limit: 10,
      find: jest.fn().mockResolvedValue([]),
    };

    // Mock Express request
    mockReq = {
      auth: {},
      config: {
        database: {
          adapter: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
      },
    };

    mockRes = {};
    mockNext = jest.fn();
  });

  describe('Query Optimizer', () => {
    it('should analyze query performance', () => {
      const className = 'TestClass';
      const duration = 150; // Slow query

      queryOptimizer.analyzeQuery(mockQuery, className, duration);

      const metrics = queryOptimizer.getMetrics();

      expect(metrics.totalQueries).toBe(1);
      expect(metrics.slowQueries).toBe(1);
      expect(metrics.queriesByClass[className]).toBeDefined();
    });

    it('should generate optimization suggestions for slow queries', () => {
      const className = 'TestClass';
      const duration = 150; // Slow query

      // Query with potential issues
      const problematicQuery = {
        _where: {
          name: { $regex: '.*test' }, // Inefficient regex
          unindexedField: 'value', // Missing index
        },
        _skip: 1500, // Large skip value
      };

      queryOptimizer.analyzeQuery(problematicQuery, className, duration);

      const suggestions = queryOptimizer.getSuggestions(className);

      expect(suggestions.length).toBeGreaterThan(0);

      const suggestionTypes = suggestions[0].suggestions.map(s => s.type);

      expect(suggestionTypes).toContain('INEFFICIENT_REGEX');
      expect(suggestionTypes).toContain('MISSING_INDEX');
      expect(suggestionTypes).toContain('LARGE_SKIP');
    });

    it('should wrap queries with performance monitoring', async () => {
      const className = 'TestClass';
      const wrappedQuery = queryOptimizer.wrapQuery(mockQuery, className);

      await wrappedQuery.find();

      const metrics = queryOptimizer.getMetrics();

      expect(metrics.totalQueries).toBe(1);
    });

    it('should clean up old statistics', () => {
      const className = 'TestClass';
      const duration = 100;

      // Add some stats
      queryOptimizer.analyzeQuery(mockQuery, className, duration);

      // Set last seen to old date
      const oldDate = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      for (const stats of queryOptimizer.queryStats.values()) {
        stats.lastSeen = oldDate;
      }
      for (const suggestion of queryOptimizer.indexSuggestions.values()) {
        suggestion.lastSeen = oldDate;
      }

      // Run cleanup
      queryOptimizer.cleanup();

      expect(queryOptimizer.queryStats.size).toBe(0);
      expect(queryOptimizer.indexSuggestions.size).toBe(0);
    });
  });

  describe('Query Optimization Middleware', () => {
    it('should skip non-Parse requests', () => {
      const reqWithoutAuth = { config: {} };

      queryOptimizationMiddleware(reqWithoutAuth, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(reqWithoutAuth.config.database?.adapter?.find).toBeUndefined();
    });

    it('should wrap Parse queries with optimization', async () => {
      queryOptimizationMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.config.database.adapter.find).toBeDefined();

      // Test wrapped query
      const className = 'TestClass';

      await mockReq.config.database.adapter.find(className, mockQuery);

      const metrics = queryOptimizer.getMetrics();

      expect(metrics.totalQueries).toBe(1);
    });

    it('should handle optimization errors gracefully', async () => {
      const error = new Error('Optimization error');
      const mockQueryWithError = {
        ...mockQuery,
        find: jest.fn().mockRejectedValue(error),
      };

      queryOptimizationMiddleware(mockReq, mockRes, mockNext);

      // Test wrapped query with error
      const className = 'TestClass';

      await mockReq.config.database.adapter.find(className, mockQueryWithError);

      // Should fall back to original query
      expect(mockReq.config.database.adapter.find).toHaveBeenCalled();
    });

    it('should preserve query context', async () => {
      queryOptimizationMiddleware(mockReq, mockRes, mockNext);

      const className = 'TestClass';
      const context = { user: 'testUser' };

      mockReq.config.database.adapter.find = mockReq.config.database.adapter.find.bind(context);

      await mockReq.config.database.adapter.find(className, mockQuery);

      // Original query should be called with correct context
      expect(mockReq.config.database.adapter.find.mock.instances[0]).toBe(context);
    });
  });
});
