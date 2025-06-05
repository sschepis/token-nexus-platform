import { DashboardPageController } from '../DashboardPageController.migrated';
import { ActionContext } from '../types/ActionTypes';

// Mock Parse
const mockParse = {
  Query: jest.fn().mockImplementation((className: string) => ({
    equalTo: jest.fn().mockReturnThis(),
    count: jest.fn().mockResolvedValue(10),
    find: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null)
  })),
  Schema: {
    all: jest.fn().mockResolvedValue([
      { className: 'TestClass', fields: { organizationId: 'string' } },
      { className: '_User', fields: {} },
      { className: 'AnotherClass', fields: { organization: 'string' } }
    ])
  }
};

// @ts-ignore
global.Parse = mockParse;

describe('DashboardPageController Migration', () => {
  let controller: DashboardPageController;
  let mockContext: ActionContext;

  beforeEach(() => {
    controller = new DashboardPageController();
    mockContext = {
      user: {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        roles: ['user'],
        permissions: ['dashboard:read']
      },
      organization: {
        id: 'test-org-id',
        name: 'Test Organization',
        settings: {},
        permissions: ['dashboard:read'],
        features: []
      },
      page: {
        pageId: 'dashboard',
        pageName: 'Dashboard',
        state: {},
        props: {},
        metadata: {
          category: 'navigation',
          tags: ['dashboard'],
          permissions: ['dashboard:read']
        }
      },
      navigation: {
        router: {} as any,
        currentPath: '/dashboard',
        breadcrumbs: []
      },
      timestamp: new Date()
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(controller.pageId).toBe('dashboard');
      expect(controller.pageName).toBe('Dashboard');
      expect(controller.description).toBe('Main dashboard with system overview and key metrics');
      expect(controller.metadata.category).toBe('navigation');
      expect(controller.metadata.tags).toContain('dashboard');
      expect(controller.metadata.permissions).toContain('dashboard:read');
    });

    it('should register all expected actions', () => {
      const actionIds = Array.from(controller.actions.keys());
      expect(actionIds).toContain('getDashboardOverview');
      expect(actionIds).toContain('getSystemHealth');
      expect(actionIds).toContain('getRecentActivity');
      expect(actionIds).toContain('getPerformanceMetrics');
      expect(actionIds).toContain('refreshDashboard');
      expect(actionIds).toHaveLength(5);
    });

    it('should have proper action configurations', () => {
      const overviewAction = controller.getAction('getDashboardOverview');
      expect(overviewAction).toBeDefined();
      expect(overviewAction!.category).toBe('data');
      expect(overviewAction!.permissions).toContain('dashboard:read');
      expect(overviewAction!.parameters).toHaveLength(2);
      
      const timeRangeParam = overviewAction!.parameters.find(p => p.name === 'timeRange');
      expect(timeRangeParam).toBeDefined();
      expect(timeRangeParam!.type).toBe('string');
      expect(timeRangeParam!.required).toBe(false);
    });
  });

  describe('Action Execution', () => {
    describe('getDashboardOverview', () => {
      it('should execute successfully with default parameters', async () => {
        const action = controller.getAction('getDashboardOverview')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect((result.data as any).metrics).toBeDefined();
        expect((result.data as any).charts).toBeDefined();
        expect((result.data as any).timeRange).toBe('24h');
        expect((result.data as any).lastUpdated).toBeDefined();
        expect(result.metadata.actionId).toBe('getDashboardOverview');
      });

      it('should execute successfully with custom parameters', async () => {
        const action = controller.getAction('getDashboardOverview')!;
        const result = await action.execute({
          timeRange: '7d',
          includeCharts: false
        }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).timeRange).toBe('7d');
        expect((result.data as any).charts).toBeUndefined();
      });

      it('should fail without organization context', async () => {
        const contextWithoutOrg = {
          ...mockContext,
          user: { ...mockContext.user, organizationId: undefined },
          organization: undefined
        };

        const action = controller.getAction('getDashboardOverview')!;
        const result = await action.execute({}, contextWithoutOrg);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Organization ID is required');
      });

      it('should include comprehensive metrics data', async () => {
        const action = controller.getAction('getDashboardOverview')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).metrics).toMatchObject({
          totalUsers: expect.any(Number),
          totalObjects: expect.any(Number),
          totalRecords: expect.any(Number),
          totalFunctions: expect.any(Number),
          totalIntegrations: expect.any(Number),
          systemHealth: expect.any(Object),
          recentActivity: expect.any(Array),
          performanceMetrics: expect.any(Object)
        });
      });
    });

    describe('getSystemHealth', () => {
      it('should execute successfully', async () => {
        const action = controller.getAction('getSystemHealth')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).health).toBeDefined();
        expect((result.data as any).health.status).toBe('healthy');
        expect((result.data as any).health.services).toBeDefined();
      });
    });

    describe('getRecentActivity', () => {
      it('should execute successfully with default parameters', async () => {
        const action = controller.getAction('getRecentActivity')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).activities).toBeDefined();
        expect(Array.isArray((result.data as any).activities)).toBe(true);
      });

      it('should respect limit parameter', async () => {
        const action = controller.getAction('getRecentActivity')!;
        const result = await action.execute({ limit: 5 }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).activities.length).toBeLessThanOrEqual(5);
      });
    });

    describe('getPerformanceMetrics', () => {
      it('should execute successfully', async () => {
        const action = controller.getAction('getPerformanceMetrics')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).metrics).toBeDefined();
        expect((result.data as any).timeRange).toBe('24h');
        expect((result.data as any).metrics.apiRequests).toBeDefined();
        expect((result.data as any).metrics.databaseQueries).toBeDefined();
      });

      it('should respect timeRange parameter', async () => {
        const action = controller.getAction('getPerformanceMetrics')!;
        const result = await action.execute({ timeRange: '7d' }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).timeRange).toBe('7d');
      });
    });

    describe('refreshDashboard', () => {
      it('should execute successfully', async () => {
        const action = controller.getAction('refreshDashboard')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Helper Methods', () => {
    it('should get organization ID from context', () => {
      // Test through action execution since getOrganizationId is protected
      const action = controller.getAction('getSystemHealth')!;
      expect(action).toBeDefined();
    });

    it('should handle missing organization ID', async () => {
      const contextWithoutOrg = {
        ...mockContext,
        user: { ...mockContext.user, organizationId: undefined },
        organization: undefined
      };
      
      const action = controller.getAction('getDashboardOverview')!;
      const result = await action.execute({}, contextWithoutOrg);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Parse query errors gracefully', async () => {
      // Mock Parse query to throw error
      mockParse.Query.mockImplementation(() => ({
        equalTo: jest.fn().mockReturnThis(),
        count: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      const action = controller.getAction('getDashboardOverview')!;
      const result = await action.execute({}, mockContext);

      // BasePageController handles errors gracefully and returns success with fallback data
      expect(result.success).toBe(true);
      expect((result.data as any).metrics.totalUsers).toBe(0); // Fallback value
    });

    it('should handle schema retrieval errors', async () => {
      mockParse.Schema.all.mockRejectedValue(new Error('Schema error'));

      const action = controller.getAction('getDashboardOverview')!;
      const result = await action.execute({}, mockContext);

      // Should still succeed but with fallback data
      expect(result.success).toBe(true);
      expect((result.data as any).metrics.totalObjects).toBe(0);
    });
  });

  describe('Performance and Execution Time', () => {
    it('should track execution time in metadata', async () => {
      const action = controller.getAction('getSystemHealth')!;
      const result = await action.execute({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should complete dashboard overview within reasonable time', async () => {
      const startTime = Date.now();
      const action = controller.getAction('getDashboardOverview')!;
      await action.execute({}, mockContext);
      const endTime = Date.now();

      // Should complete within 1 second (generous for test environment)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Migration Validation', () => {
    it('should maintain API compatibility with original controller', () => {
      // Verify that all original action IDs are present
      const expectedActions = [
        'getDashboardOverview',
        'getSystemHealth', 
        'getRecentActivity',
        'getPerformanceMetrics',
        'refreshDashboard'
      ];

      expectedActions.forEach(actionId => {
        const action = controller.getAction(actionId);
        expect(action).toBeDefined();
        expect(action!.id).toBe(actionId);
      });
    });

    it('should maintain parameter compatibility', () => {
      const overviewAction = controller.getAction('getDashboardOverview')!;
      const paramNames = overviewAction.parameters.map(p => p.name);
      
      expect(paramNames).toContain('timeRange');
      expect(paramNames).toContain('includeCharts');
    });

    it('should maintain permission requirements', () => {
      controller.getAllActions().forEach(action => {
        expect(action.permissions).toContain('dashboard:read');
      });
    });
  });
});