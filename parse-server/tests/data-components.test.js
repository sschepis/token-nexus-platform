/**
 * Data Components Tests
 * Tests data-aware components functionality
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const WebsiteBuilder = require('../src/website-builder').default;
const dataComponents = require('../src/website-builder/data-components');

describe('Data Components', () => {
  let editor;
  let builder;
  let user;
  let testClass;

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();

    // Create test class
    const schema = new Parse.Schema('TestClass');
    schema.addString('name');
    schema.addNumber('value');
    schema.addBoolean('active');
    await schema.save();

    // Add test data
    testClass = new Parse.Object('TestClass');
    testClass.set({
      name: 'Test Item',
      value: 42,
      active: true,
    });
    await testClass.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    // Clean up test class
    const schema = new Parse.Schema('TestClass');
    await schema.delete();
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    builder = new WebsiteBuilder({
      container: document.createElement('div'),
    });
    editor = builder.initialize();
  });

  describe('Component Registration', () => {
    test('should register data components', () => {
      dataComponents.helpers.registerAll(editor);

      // Check if components are registered
      expect(editor.DomComponents.getType('data-dataList')).toBeDefined();
      expect(editor.DomComponents.getType('data-dataGrid')).toBeDefined();
      expect(editor.DomComponents.getType('data-dataCard')).toBeDefined();
    });

    test('should register component with correct traits', () => {
      dataComponents.helpers.registerComponent(editor, 'data-test', dataComponents.lists.dataList);

      const componentType = editor.DomComponents.getType('data-test');
      const traits = componentType.model.prototype.defaults.traits;

      expect(traits).toContainEqual(
        expect.objectContaining({
          type: 'select',
          name: 'className',
        })
      );
    });
  });

  describe('Data List Component', () => {
    test('should fetch and display data', async () => {
      dataComponents.helpers.registerComponent(editor, 'data-list', dataComponents.lists.dataList);

      const component = editor.addComponent({
        type: 'data-list',
        className: 'TestClass',
      });

      // Wait for data to load
      await new Promise(resolve => setTimeout(resolve, 100));

      const html = component.get('components').models[0].toHTML();
      expect(html).toContain('Test Item');
    });

    test('should handle pagination', async () => {
      // Add more test data
      for (let i = 0; i < 15; i++) {
        const item = new Parse.Object('TestClass');
        item.set({
          name: `Item ${i}`,
          value: i,
          active: true,
        });
        await item.save(null, { useMasterKey: true });
      }

      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestClass',
          pagination: {
            enabled: true,
            itemsPerPage: 10,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      // Should only show 10 items
      const itemCount = (html.match(/Item \d+/g) || []).length;
      expect(itemCount).toBe(10);
    });
  });

  describe('Data Card Component', () => {
    test('should display single item', async () => {
      const component = editor.addComponent({
        type: 'data-dataCard',
        config: {
          className: 'TestClass',
          objectId: testClass.id,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('Test Item');
      expect(html).toContain('42');
    });

    test('should handle template switching', async () => {
      const component = editor.addComponent({
        type: 'data-dataCard',
        config: {
          className: 'TestClass',
          objectId: testClass.id,
          template: 'compact',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('data-card-compact');
    });
  });

  describe('Data Form Component', () => {
    test('should create form for data entry', async () => {
      const component = editor.addComponent({
        type: 'data-dataForm',
        config: {
          className: 'TestClass',
          fields: ['name', 'value', 'active'],
        },
      });

      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('input');
      expect(html).toContain('name="name"');
      expect(html).toContain('name="value"');
      expect(html).toContain('name="active"');
    });

    test('should handle form submission', async () => {
      const component = editor.addComponent({
        type: 'data-dataForm',
        config: {
          className: 'TestClass',
          fields: ['name', 'value'],
        },
      });

      // Simulate form submission
      const form = component.get('components').models[0];
      await form.submit({
        name: 'New Item',
        value: 100,
      });

      // Verify new item was created
      const query = new Parse.Query('TestClass');
      const result = await query.find({ useMasterKey: true });
      const newItem = result.find(item => item.get('name') === 'New Item');

      expect(newItem).toBeDefined();
      expect(newItem.get('value')).toBe(100);
    });
  });

  describe('Data Chart Component', () => {
    test('should generate chart from data', async () => {
      // Add test data for chart
      for (let i = 0; i < 5; i++) {
        const item = new Parse.Object('TestClass');
        item.set({
          name: `Category ${i}`,
          value: i * 10,
        });
        await item.save(null, { useMasterKey: true });
      }

      const component = editor.addComponent({
        type: 'data-dataChart',
        config: {
          className: 'TestClass',
          type: 'bar',
          dataField: 'value',
          groupBy: 'name',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('chart');
      expect(html).toContain('Category');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid class name', async () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'NonexistentClass',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('Error');
    });

    test('should handle query errors', async () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestClass',
          query: {
            invalidOperation: true,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('Error');
    });
  });

  describe('Real-time Updates', () => {
    test('should update component when data changes', async () => {
      const component = editor.addComponent({
        type: 'data-dataCard',
        config: {
          className: 'TestClass',
          objectId: testClass.id,
        },
      });

      // Update test object
      testClass.set('name', 'Updated Item');
      await testClass.save(null, { useMasterKey: true });

      // Wait for live query update
      await new Promise(resolve => setTimeout(resolve, 500));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('Updated Item');
    });
  });
});
