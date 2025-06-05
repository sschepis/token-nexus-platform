import { NotificationsPageController } from '../NotificationsPageController.migrated';
import { ActionContext } from '../types/ActionTypes';

// Mock Parse
const mockParse = {
  Query: jest.fn().mockImplementation((className: string) => ({
    equalTo: jest.fn().mockReturnThis(),
    containedIn: jest.fn().mockReturnThis(),
    notEqualTo: jest.fn().mockReturnThis(),
    descending: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    matchesQuery: jest.fn().mockReturnThis(),
    find: jest.fn().mockResolvedValue([]),
    first: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    or: jest.fn().mockReturnValue({
      notEqualTo: jest.fn().mockReturnThis(),
      equalTo: jest.fn().mockReturnThis(),
      descending: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0)
    })
  })),
  Object: {
    extend: jest.fn().mockImplementation((className: string) => {
      return jest.fn().mockImplementation(() => ({
        set: jest.fn(),
        save: jest.fn().mockResolvedValue({
          id: 'test-notification-id',
          toJSON: jest.fn().mockReturnValue({
            objectId: 'test-notification-id',
            title: 'Test Notification',
            message: 'Test message'
          })
        }),
        destroy: jest.fn().mockResolvedValue(true)
      }));
    })
  }
};

// Add static or method to Parse.Query
(mockParse.Query as any).or = jest.fn().mockReturnValue({
  notEqualTo: jest.fn().mockReturnThis(),
  equalTo: jest.fn().mockReturnThis(),
  descending: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  find: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0)
});

// @ts-ignore
global.Parse = mockParse;

describe('NotificationsPageController Migration', () => {
  let controller: NotificationsPageController;
  let mockContext: ActionContext;

  beforeEach(() => {
    controller = new NotificationsPageController();
    mockContext = {
      user: {
        userId: 'test-user-id',
        organizationId: 'test-org-id',
        roles: ['user'],
        permissions: ['notifications:read', 'notifications:write', 'notifications:manage']
      },
      organization: {
        id: 'test-org-id',
        name: 'Test Organization',
        settings: {},
        permissions: ['notifications:read', 'notifications:write', 'notifications:manage'],
        features: []
      },
      page: {
        pageId: 'notifications',
        pageName: 'Notifications',
        state: {},
        props: {},
        metadata: {
          category: 'communication',
          tags: ['notifications'],
          permissions: ['notifications:read']
        }
      },
      navigation: {
        router: {} as any,
        currentPath: '/notifications',
        breadcrumbs: []
      },
      timestamp: new Date()
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should initialize with correct metadata', () => {
      expect(controller.pageId).toBe('notifications');
      expect(controller.pageName).toBe('Notifications');
      expect(controller.description).toBe('Manage system notifications, alerts, and messaging');
      expect(controller.metadata.category).toBe('communication');
      expect(controller.metadata.tags).toContain('notifications');
      expect(controller.metadata.permissions).toContain('notifications:read');
    });

    it('should register all expected actions', () => {
      const actionIds = Array.from(controller.actions.keys());
      expect(actionIds).toContain('fetchNotifications');
      expect(actionIds).toContain('createNotification');
      expect(actionIds).toContain('markAsRead');
      expect(actionIds).toContain('archiveNotifications');
      expect(actionIds).toContain('deleteNotifications');
      expect(actionIds).toContain('getNotificationTypes');
      expect(actionIds).toHaveLength(6);
    });

    it('should have proper action configurations', () => {
      const fetchAction = controller.getAction('fetchNotifications');
      expect(fetchAction).toBeDefined();
      expect(fetchAction!.category).toBe('data');
      expect(fetchAction!.permissions).toContain('notifications:read');
      expect(fetchAction!.parameters).toHaveLength(5);
      
      const typeParam = fetchAction!.parameters.find(p => p.name === 'type');
      expect(typeParam).toBeDefined();
      expect(typeParam!.type).toBe('string');
      expect(typeParam!.required).toBe(false);
    });
  });

  describe('Action Execution', () => {
    describe('fetchNotifications', () => {
      it('should execute successfully with default parameters', async () => {
        // Mock notifications data
        const mockNotifications = [
          {
            toJSON: () => ({
              objectId: 'notif1',
              title: 'Test Notification 1',
              message: 'Test message 1',
              type: 'system',
              status: 'unread'
            })
          },
          {
            toJSON: () => ({
              objectId: 'notif2',
              title: 'Test Notification 2',
              message: 'Test message 2',
              type: 'alert',
              status: 'read'
            })
          }
        ];

        mockParse.Query.mockImplementation(() => ({
          equalTo: jest.fn().mockReturnThis(),
          notEqualTo: jest.fn().mockReturnThis(),
          descending: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue(mockNotifications),
          count: jest.fn().mockResolvedValue(1)
        }));

        (mockParse.Query as any).or = jest.fn().mockReturnValue({
          notEqualTo: jest.fn().mockReturnThis(),
          descending: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue(mockNotifications),
          count: jest.fn().mockResolvedValue(1)
        });

        const action = controller.getAction('fetchNotifications')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).notifications).toHaveLength(2);
        expect((result.data as any).unreadCount).toBe(1);
        expect((result.data as any).totalCount).toBe(2);
      });

      it('should fail without organization context', async () => {
        const contextWithoutOrg = {
          ...mockContext,
          user: { ...mockContext.user, organizationId: undefined },
          organization: undefined
        };

        const action = controller.getAction('fetchNotifications')!;
        const result = await action.execute({}, contextWithoutOrg);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Organization ID is required');
      });

      it('should apply filters correctly', async () => {
        const mockQuery = {
          equalTo: jest.fn().mockReturnThis(),
          notEqualTo: jest.fn().mockReturnThis(),
          descending: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0)
        };

        mockParse.Query.mockImplementation(() => mockQuery);
        (mockParse.Query as any).or = jest.fn().mockReturnValue(mockQuery);

        const action = controller.getAction('fetchNotifications')!;
        await action.execute({
          type: 'system',
          status: 'unread',
          priority: 'high',
          limit: 25,
          includeArchived: true
        }, mockContext);

        expect(mockQuery.equalTo).toHaveBeenCalledWith('type', 'system');
        expect(mockQuery.equalTo).toHaveBeenCalledWith('status', 'unread');
        expect(mockQuery.equalTo).toHaveBeenCalledWith('priority', 'high');
        expect(mockQuery.limit).toHaveBeenCalledWith(25);
      });
    });

    describe('createNotification', () => {
      it('should create notification successfully', async () => {
        const mockNotification = {
          set: jest.fn(),
          save: jest.fn().mockResolvedValue({
            id: 'new-notification-id',
            toJSON: jest.fn().mockReturnValue({
              objectId: 'new-notification-id',
              title: 'New Notification',
              message: 'New message'
            })
          })
        };

        const MockNotificationClass = jest.fn().mockImplementation(() => mockNotification);
        mockParse.Object.extend.mockReturnValue(MockNotificationClass);

        const action = controller.getAction('createNotification')!;
        const result = await action.execute({
          title: 'Test Notification',
          message: 'Test message',
          type: 'system',
          recipientType: 'user'
        }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).notification).toBeDefined();
        expect(mockNotification.set).toHaveBeenCalledWith('title', 'Test Notification');
        expect(mockNotification.set).toHaveBeenCalledWith('message', 'Test message');
        expect(mockNotification.set).toHaveBeenCalledWith('type', 'system');
        expect(mockNotification.set).toHaveBeenCalledWith('organizationId', 'test-org-id');
      });

      it('should fail without organization context', async () => {
        const contextWithoutOrg = {
          ...mockContext,
          user: { ...mockContext.user, organizationId: undefined },
          organization: undefined
        };

        const action = controller.getAction('createNotification')!;
        const result = await action.execute({
          title: 'Test',
          message: 'Test',
          type: 'system',
          recipientType: 'user'
        }, contextWithoutOrg);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Organization ID is required');
      });
    });

    describe('markAsRead', () => {
      it('should mark notifications as read successfully', async () => {
        const mockNotifications = [
          { id: 'notif1', set: jest.fn(), save: jest.fn().mockResolvedValue(true) },
          { id: 'notif2', set: jest.fn(), save: jest.fn().mockResolvedValue(true) }
        ];

        mockParse.Query.mockImplementation(() => ({
          containedIn: jest.fn().mockReturnThis(),
          matchesQuery: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue(mockNotifications)
        }));

        const action = controller.getAction('markAsRead')!;
        const result = await action.execute({
          notificationIds: ['notif1', 'notif2']
        }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).updatedCount).toBe(2);
        expect(mockNotifications[0].set).toHaveBeenCalledWith('status', 'read');
        expect(mockNotifications[1].set).toHaveBeenCalledWith('status', 'read');
      });

      it('should fail with empty notification IDs', async () => {
        const action = controller.getAction('markAsRead')!;
        const result = await action.execute({
          notificationIds: []
        }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Notification IDs array is required');
      });
    });

    describe('archiveNotifications', () => {
      it('should archive notifications successfully', async () => {
        const mockNotifications = [
          { id: 'notif1', set: jest.fn(), save: jest.fn().mockResolvedValue(true) }
        ];

        mockParse.Query.mockImplementation(() => ({
          containedIn: jest.fn().mockReturnThis(),
          matchesQuery: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue(mockNotifications)
        }));

        const action = controller.getAction('archiveNotifications')!;
        const result = await action.execute({
          notificationIds: ['notif1']
        }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).archivedCount).toBe(1);
        expect(mockNotifications[0].set).toHaveBeenCalledWith('status', 'archived');
      });
    });

    describe('deleteNotifications', () => {
      it('should delete notifications successfully', async () => {
        const mockNotifications = [
          { id: 'notif1', destroy: jest.fn().mockResolvedValue(true) }
        ];

        mockParse.Query.mockImplementation(() => ({
          containedIn: jest.fn().mockReturnThis(),
          matchesQuery: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue(mockNotifications)
        }));

        const action = controller.getAction('deleteNotifications')!;
        const result = await action.execute({
          notificationIds: ['notif1'],
          confirmDelete: true
        }, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).deletedCount).toBe(1);
        expect(mockNotifications[0].destroy).toHaveBeenCalled();
      });

      it('should fail without confirmation', async () => {
        const action = controller.getAction('deleteNotifications')!;
        const result = await action.execute({
          notificationIds: ['notif1'],
          confirmDelete: false
        }, mockContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Delete confirmation is required');
      });
    });

    describe('getNotificationTypes', () => {
      it('should return notification types successfully', async () => {
        const mockNotifications = [
          { get: jest.fn().mockReturnValue('system') },
          { get: jest.fn().mockReturnValue('alert') },
          { get: jest.fn().mockReturnValue('system') } // duplicate
        ];

        const mockConfig = {
          get: jest.fn().mockReturnValue(['workflow', 'reminder'])
        };

        mockParse.Query.mockImplementation((className: string) => {
          if (className === 'Notification') {
            return {
              equalTo: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              find: jest.fn().mockResolvedValue(mockNotifications)
            };
          } else if (className === 'NotificationConfig') {
            return {
              equalTo: jest.fn().mockReturnThis(),
              first: jest.fn().mockResolvedValue(mockConfig)
            };
          }
          return {
            equalTo: jest.fn().mockReturnThis(),
            find: jest.fn().mockResolvedValue([]),
            first: jest.fn().mockResolvedValue(null)
          };
        });

        const action = controller.getAction('getNotificationTypes')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).types).toContain('system');
        expect((result.data as any).types).toContain('alert');
        expect((result.data as any).types).toContain('workflow');
        expect((result.data as any).types).toContain('reminder');
        expect((result.data as any).usedTypes).toEqual(['alert', 'system']);
        expect((result.data as any).systemTypes).toEqual(['reminder', 'workflow']);
      });

      it('should return default types when no data found', async () => {
        mockParse.Query.mockImplementation(() => ({
          equalTo: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          find: jest.fn().mockResolvedValue([]),
          first: jest.fn().mockResolvedValue(null)
        }));

        const action = controller.getAction('getNotificationTypes')!;
        const result = await action.execute({}, mockContext);

        expect(result.success).toBe(true);
        expect((result.data as any).types).toContain('system');
        expect((result.data as any).types).toContain('security');
        expect((result.data as any).types).toContain('alert');
        expect((result.data as any).types.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Migration Validation', () => {
    it('should maintain API compatibility with original controller', () => {
      const expectedActions = [
        'fetchNotifications',
        'createNotification',
        'markAsRead',
        'archiveNotifications',
        'deleteNotifications',
        'getNotificationTypes'
      ];

      expectedActions.forEach(actionId => {
        const action = controller.getAction(actionId);
        expect(action).toBeDefined();
        expect(action!.id).toBe(actionId);
      });
    });

    it('should maintain parameter compatibility', () => {
      const fetchAction = controller.getAction('fetchNotifications')!;
      const paramNames = fetchAction.parameters.map(p => p.name);
      
      expect(paramNames).toContain('type');
      expect(paramNames).toContain('status');
      expect(paramNames).toContain('priority');
      expect(paramNames).toContain('limit');
      expect(paramNames).toContain('includeArchived');
    });

    it('should maintain permission requirements', () => {
      const readActions = ['fetchNotifications', 'markAsRead', 'getNotificationTypes'];
      const writeActions = ['createNotification', 'archiveNotifications'];
      const manageActions = ['deleteNotifications'];

      readActions.forEach(actionId => {
        const action = controller.getAction(actionId)!;
        expect(action.permissions).toContain('notifications:read');
      });

      writeActions.forEach(actionId => {
        const action = controller.getAction(actionId)!;
        expect(action.permissions).toContain('notifications:write');
      });

      manageActions.forEach(actionId => {
        const action = controller.getAction(actionId)!;
        expect(action.permissions).toContain('notifications:manage');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Parse query errors gracefully', async () => {
      mockParse.Query.mockImplementation(() => ({
        equalTo: jest.fn().mockReturnThis(),
        find: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      const action = controller.getAction('fetchNotifications')!;
      const result = await action.execute({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('Performance and Execution Time', () => {
    it('should track execution time in metadata', async () => {
      const action = controller.getAction('getNotificationTypes')!;
      const result = await action.execute({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
    });
  });
});