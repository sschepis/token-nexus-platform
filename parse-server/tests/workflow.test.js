const Parse = require('parse/node');
const WorkflowService = require('../src/services/WorkflowService');

describe('Workflow System', () => {
  let testUser;
  let testContent;
  let testWorkflow;

  beforeAll(async () => {
    // Initialize Parse
    Parse.initialize('myAppId', 'myJavaScriptKey', 'myMasterKey');
    Parse.serverURL = 'http://localhost:1337/parse';

    // Initialize Workflow Service
    await WorkflowService.initialize();

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
    content.set('content', 'This is test content for workflow testing');
    content.set('status', 'draft');

    testContent = await content.save(null, { useMasterKey: true });
  });

  describe('Workflow Creation', () => {
    it('should create a workflow successfully', async () => {
      const params = {
        name: 'Test Workflow',
        description: 'Test workflow for content approval',
        stages: [
          { id: 'draft', name: 'Draft', type: 'start' },
          { id: 'review', name: 'Review', type: 'review' },
          { id: 'published', name: 'Published', type: 'end' },
        ],
        transitions: [
          { from: 'draft', to: 'review', action: 'submit' },
          { from: 'review', to: 'published', action: 'approve' },
          { from: 'review', to: 'draft', action: 'reject' },
        ],
        settings: {
          requireApproval: true,
          autoPublish: false,
        },
      };

      const workflow = await Parse.Cloud.run('createWorkflow', params);
      testWorkflow = workflow;

      expect(workflow.id).toBeTruthy();
      expect(workflow.get('name')).toBe('Test Workflow');
      expect(workflow.get('stages').length).toBe(3);
      expect(workflow.get('transitions').length).toBe(3);
    });

    it('should validate required workflow parameters', async () => {
      const params = {
        name: 'Invalid Workflow',
        // Missing required parameters
      };

      await expect(Parse.Cloud.run('createWorkflow', params)).rejects.toThrow(
        'Missing required parameters'
      );
    });
  });

  describe('Workflow Instance', () => {
    it('should start a workflow instance', async () => {
      const params = {
        workflowId: testWorkflow.id,
        contentId: testContent.id,
        metadata: {
          priority: 'high',
        },
      };

      const instance = await Parse.Cloud.run('startWorkflowInstance', params);

      expect(instance.id).toBeTruthy();
      expect(instance.get('contentId')).toBe(testContent.id);
      expect(instance.get('currentStage')).toBe('draft');
      expect(instance.get('status')).toBe('active');
    });

    it('should transition workflow instance', async () => {
      // Start workflow instance
      const startParams = {
        workflowId: testWorkflow.id,
        contentId: testContent.id,
      };
      const instance = await Parse.Cloud.run('startWorkflowInstance', startParams);

      // Transition to review
      const transitionParams = {
        instanceId: instance.id,
        action: 'submit',
        comments: 'Ready for review',
      };

      const updatedInstance = await Parse.Cloud.run('transitionWorkflow', transitionParams);

      expect(updatedInstance.get('currentStage')).toBe('review');
      expect(updatedInstance.get('history').length).toBeGreaterThan(1);
    });
  });

  describe('Content Versioning', () => {
    it('should create content version', async () => {
      const params = {
        contentId: testContent.id,
        changes: {
          title: {
            old: 'Test Content',
            new: 'Updated Test Content',
          },
          content: {
            old: 'This is test content',
            new: 'This is updated test content',
          },
        },
        description: 'Updated content title and body',
      };

      const version = await Parse.Cloud.run('createVersion', params);

      expect(version.id).toBeTruthy();
      expect(version.get('contentId')).toBe(testContent.id);
      expect(version.get('changes')).toBeTruthy();
    });

    it('should automatically create version on content update', async () => {
      // Update content
      testContent.set('title', 'Auto-versioned Content');
      await testContent.save(null, { useMasterKey: true });

      // Check for version
      const query = new Parse.Query('ContentVersion');
      query.equalTo('contentId', testContent.id);
      const versions = await query.find({ useMasterKey: true });

      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].get('changes').title).toBeTruthy();
    });
  });

  describe('A/B Testing', () => {
    it('should start A/B test', async () => {
      const params = {
        contentId: testContent.id,
        variants: [
          {
            id: 'A',
            changes: {
              title: 'Variant A Title',
            },
          },
          {
            id: 'B',
            changes: {
              title: 'Variant B Title',
            },
          },
        ],
        metrics: ['pageViews', 'engagement'],
        duration: 3600, // 1 hour
      };

      const test = await Parse.Cloud.run('startABTest', params);

      expect(test.id).toBeTruthy();
      expect(test.get('status')).toBe('running');
      expect(test.get('variants').length).toBe(2);
    });

    it('should complete A/B test and apply winner', async () => {
      // Create test with short duration
      const params = {
        contentId: testContent.id,
        variants: [
          {
            id: 'A',
            changes: {
              title: 'Winning Title',
            },
          },
          {
            id: 'B',
            changes: {
              title: 'Alternative Title',
            },
          },
        ],
        metrics: ['pageViews'],
        duration: 1, // 1 second
      };

      const test = await Parse.Cloud.run('startABTest', params);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify test completion
      const query = new Parse.Query('ABTest');
      const completedTest = await query.get(test.id, { useMasterKey: true });

      expect(completedTest.get('status')).toBe('completed');
      expect(completedTest.get('results')).toBeTruthy();
    });
  });

  describe('Workflow Integration', () => {
    it('should update content status based on workflow stage', async () => {
      // Start workflow
      const instance = await Parse.Cloud.run('startWorkflowInstance', {
        workflowId: testWorkflow.id,
        contentId: testContent.id,
      });

      // Transition to published
      await Parse.Cloud.run('transitionWorkflow', {
        instanceId: instance.id,
        action: 'submit',
      });

      await Parse.Cloud.run('transitionWorkflow', {
        instanceId: instance.id,
        action: 'approve',
      });

      // Verify content status
      const query = new Parse.Query('Content');
      const updatedContent = await query.get(testContent.id, { useMasterKey: true });

      expect(updatedContent.get('status')).toBe('published');
      expect(updatedContent.get('publishedAt')).toBeTruthy();
    });
  });

  afterEach(async () => {
    // Clean up test data
    const queries = [
      new Parse.Query('Content'),
      new Parse.Query('Workflow'),
      new Parse.Query('WorkflowInstance'),
      new Parse.Query('ContentVersion'),
      new Parse.Query('ABTest'),
    ];

    for (const query of queries) {
      const objects = await query.find({ useMasterKey: true });
      await Parse.Object.destroyAll(objects, { useMasterKey: true });
    }
  });

  afterAll(async () => {
    // Clean up test user
    await testUser.destroy({ useMasterKey: true });
  });
});
