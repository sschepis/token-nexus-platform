/**
 * AI Assistant Integration Tests
 * Tests the Phase 1 implementation of the UnifiedLLMService and OrgAssistantService
 */

// Load the AI assistant functions
require('../cloud/functions/aiAssistant');

describe('AI Assistant Phase 1 Integration', () => {
  describe('UnifiedLLMService', () => {
    test('should be defined and instantiable', () => {
      expect(typeof global.UnifiedLLMService).toBe('function');
      
      const llmService = new global.UnifiedLLMService();
      expect(llmService).toBeDefined();
      expect(typeof llmService.query).toBe('function');
      expect(typeof llmService.calculateCost).toBe('function');
    });

    test('should have provider switching capabilities', () => {
      const llmService = new global.UnifiedLLMService();
      expect(typeof llmService.switchProvider).toBe('function');
    });
  });

  describe('OrgAssistantService', () => {
    let assistantService;

    beforeEach(() => {
      assistantService = new global.OrgAssistantService();
    });

    test('should be defined and instantiable', () => {
      expect(typeof global.OrgAssistantService).toBe('function');
      expect(assistantService).toBeDefined();
      expect(typeof assistantService.processQuery).toBe('function');
      expect(typeof assistantService.constructMessages).toBe('function');
    });

    test('constructMessages should format messages correctly', () => {
      const testData = {
        query: 'Test query',
        history: [],
        schemas: { User: { fields: { username: 'string' } } },
        tools: [{ name: 'testTool', description: 'Test tool', parametersSchema: {} }],
        userContext: {
          userId: 'test-user',
          orgId: 'test-org',
          roles: ['user']
        }
      };

      const messages = assistantService.constructMessages(testData);
      
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Token Nexus Platform');
      expect(messages[messages.length - 1].role).toBe('user');
      expect(messages[messages.length - 1].content).toBe('Test query');
    });

    test('constructMessages should prioritize currentConversationMessages', () => {
      const currentConversationMessages = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      const testData = {
        query: 'New query',
        history: [{ user: 'Old message', assistant: 'Old response' }],
        schemas: {},
        tools: [],
        userContext: {
          userId: 'test-user',
          orgId: 'test-org',
          roles: ['user']
        },
        currentConversationMessages
      };

      const messages = assistantService.constructMessages(testData);
      
      expect(messages.length).toBe(4); // system + 2 conversation + new query
      expect(messages[1].content).toBe('Previous message');
      expect(messages[2].content).toBe('Previous response');
      expect(messages[3].content).toBe('New query');
    });

    test('constructMessages should handle database history format', () => {
      const testData = {
        query: 'New query',
        history: [
          { user: 'Database user message', assistant: 'Database assistant response' }
        ],
        schemas: {},
        tools: [],
        userContext: {
          userId: 'test-user',
          orgId: 'test-org',
          roles: ['user']
        }
      };

      const messages = assistantService.constructMessages(testData);
      
      expect(messages.length).toBe(4); // system + user + assistant + new query
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('Database user message');
      expect(messages[2].role).toBe('assistant');
      expect(messages[2].content).toBe('Database assistant response');
    });

    test('constructMessages should include schemas and tools in system message', () => {
      const testData = {
        query: 'Test query',
        history: [],
        schemas: { User: { fields: { username: 'string' } } },
        tools: [{ name: 'getUserInfo', description: 'Get user information', parametersSchema: {} }],
        userContext: {
          userId: 'test-user',
          orgId: 'test-org',
          roles: ['admin']
        }
      };

      const messages = assistantService.constructMessages(testData);
      const systemMessage = messages[0].content;
      
      expect(systemMessage).toContain('User');
      expect(systemMessage).toContain('getUserInfo');
      expect(systemMessage).toContain('test-user');
      expect(systemMessage).toContain('test-org');
      expect(systemMessage).toContain('admin');
    });
  });

  describe('Integration', () => {
    test('Phase 1 implementation should be complete', () => {
      // Verify all required classes are available
      expect(global.UnifiedLLMService).toBeDefined();
      expect(global.OrgAssistantService).toBeDefined();
      expect(global.ToolExecutor).toBeDefined();
      
      // Verify the integration works
      const assistantService = new global.OrgAssistantService();
      const llmService = new global.UnifiedLLMService();
      
      expect(assistantService.constructMessages).toBeDefined();
      expect(llmService.query).toBeDefined();
      expect(llmService.switchProvider).toBeDefined();
    });
  });
});