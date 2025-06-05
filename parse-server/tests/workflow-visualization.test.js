const Parse = require('parse/node');
const { setupTestEnvironment, teardownTestEnvironment } = require('./helpers');

describe('Workflow Visualization', () => {
  let testOrg;
  let testWorkflow;

  beforeAll(async () => {
    await setupTestEnvironment();

    // Create test organization
    testOrg = new Parse.Object('Organization');
    testOrg.set({
      name: 'Test Organization',
      status: 'active',
    });
    await testOrg.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    // Create test workflow before each test
    testWorkflow = new Parse.Object('CMSWorkflow');
    testWorkflow.set({
      name: 'Test Workflow',
      organization: testOrg,
      status: 'draft',
      version: '1.0.0',
      definition: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' },
          },
          {
            id: 'task-1',
            type: 'task',
            position: { x: 100, y: 200 },
            data: {
              label: 'Review',
              assignee: 'editor',
              dueDate: new Date().toISOString(),
            },
          },
          {
            id: 'decision-1',
            type: 'decision',
            position: { x: 100, y: 300 },
            data: {
              label: 'Approved?',
              condition: 'status === "approved"',
            },
          },
          {
            id: 'end',
            type: 'end',
            position: { x: 100, y: 400 },
            data: { label: 'End' },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start',
            target: 'task-1',
            type: 'smoothstep',
          },
          {
            id: 'edge-2',
            source: 'task-1',
            target: 'decision-1',
            type: 'smoothstep',
          },
          {
            id: 'edge-3',
            source: 'decision-1',
            target: 'end',
            sourceHandle: 'yes',
            type: 'smoothstep',
          },
        ],
      },
    });
    await testWorkflow.save(null, { useMasterKey: true });
  });

  afterEach(async () => {
    // Cleanup test workflow after each test
    await testWorkflow.destroy({ useMasterKey: true });
  });

  describe('Workflow Definition', () => {
    test('should create workflow with valid definition', async () => {
      const workflow = await new Parse.Query('CMSWorkflow').get(testWorkflow.id, {
        useMasterKey: true,
      });

      const definition = workflow.get('definition');

      expect(definition).toBeDefined();
      expect(definition.nodes).toHaveLength(4);
      expect(definition.edges).toHaveLength(3);
    });

    test('should validate node types', () => {
      const definition = testWorkflow.get('definition');
      const nodeTypes = definition.nodes.map(node => node.type);

      expect(nodeTypes).toContain('start');
      expect(nodeTypes).toContain('task');
      expect(nodeTypes).toContain('decision');
      expect(nodeTypes).toContain('end');
    });

    test('should validate edge connections', () => {
      const definition = testWorkflow.get('definition');
      const edges = definition.edges;

      // All edges should have valid source and target nodes
      edges.forEach(edge => {
        const sourceNode = definition.nodes.find(n => n.id === edge.source);
        const targetNode = definition.nodes.find(n => n.id === edge.target);

        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();
      });
    });

    test('should validate decision node connections', () => {
      const definition = testWorkflow.get('definition');
      const decisionNode = definition.nodes.find(n => n.type === 'decision');
      const decisionEdges = definition.edges.filter(e => e.source === decisionNode.id);

      expect(decisionEdges.some(e => e.sourceHandle === 'yes')).toBeTruthy();
    });
  });

  describe('Workflow Updates', () => {
    test('should update node positions', async () => {
      const definition = testWorkflow.get('definition');
      const updatedNodes = definition.nodes.map(node => ({
        ...node,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
      }));

      testWorkflow.set('definition', {
        ...definition,
        nodes: updatedNodes,
      });
      await testWorkflow.save(null, { useMasterKey: true });

      const updatedWorkflow = await new Parse.Query('CMSWorkflow').get(testWorkflow.id, {
        useMasterKey: true,
      });

      const newDefinition = updatedWorkflow.get('definition');

      expect(newDefinition.nodes[0].position).toEqual({ x: 150, y: 150 });
    });

    test('should add new nodes and edges', async () => {
      const definition = testWorkflow.get('definition');
      const newNode = {
        id: 'task-2',
        type: 'task',
        position: { x: 250, y: 300 },
        data: {
          label: 'Additional Review',
          assignee: 'senior-editor',
        },
      };
      const newEdge = {
        id: 'edge-4',
        source: 'decision-1',
        target: 'task-2',
        sourceHandle: 'no',
        type: 'smoothstep',
      };

      testWorkflow.set('definition', {
        nodes: [...definition.nodes, newNode],
        edges: [...definition.edges, newEdge],
      });
      await testWorkflow.save(null, { useMasterKey: true });

      const updatedWorkflow = await new Parse.Query('CMSWorkflow').get(testWorkflow.id, {
        useMasterKey: true,
      });

      const newDefinition = updatedWorkflow.get('definition');

      expect(newDefinition.nodes).toHaveLength(5);
      expect(newDefinition.edges).toHaveLength(4);
    });
  });

  describe('Workflow Validation', () => {
    test('should require start and end nodes', async () => {
      const definition = testWorkflow.get('definition');
      const noStartNode = {
        nodes: definition.nodes.filter(n => n.type !== 'start'),
        edges: definition.edges,
      };

      testWorkflow.set('definition', noStartNode);
      await expect(testWorkflow.save(null, { useMasterKey: true })).rejects.toThrow();
    });

    test('should validate node data', async () => {
      const definition = testWorkflow.get('definition');
      const invalidNode = {
        ...definition.nodes[1],
        data: {}, // Missing required label
      };

      testWorkflow.set('definition', {
        nodes: [definition.nodes[0], invalidNode, ...definition.nodes.slice(2)],
        edges: definition.edges,
      });

      await expect(testWorkflow.save(null, { useMasterKey: true })).rejects.toThrow();
    });

    test('should prevent cycles in workflow', async () => {
      const definition = testWorkflow.get('definition');
      const cyclicEdge = {
        id: 'edge-cycle',
        source: 'end',
        target: 'start',
        type: 'smoothstep',
      };

      testWorkflow.set('definition', {
        nodes: definition.nodes,
        edges: [...definition.edges, cyclicEdge],
      });

      await expect(testWorkflow.save(null, { useMasterKey: true })).rejects.toThrow();
    });
  });
});
