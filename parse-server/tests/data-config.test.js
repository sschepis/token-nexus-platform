/**
 * Data Configuration Tests
 * Tests data component configuration and templates
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('./setup');
const WebsiteBuilder = require('../src/website-builder').default;
const dataConfig = require('../src/website-builder/data-config');

describe('Data Configuration', () => {
  let editor;
  let builder;
  let testData;

  beforeAll(async () => {
    await setupTestEnvironment();

    // Create test schema
    const schema = new Parse.Schema('TestData');
    schema.addString('title');
    schema.addString('description');
    schema.addNumber('price');
    schema.addBoolean('active');
    schema.addDate('date');
    schema.addFile('image');
    await schema.save();

    // Create test data
    testData = new Parse.Object('TestData');
    testData.set({
      title: 'Test Item',
      description: 'Test Description',
      price: 99.99,
      active: true,
      date: new Date(),
      image: new Parse.File('test.jpg', {
        base64: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      }),
    });
    await testData.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    const schema = new Parse.Schema('TestData');
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

  describe('Template Rendering', () => {
    test('should render list template', async () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestData',
          template: dataConfig.templates.list.default,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('data-list');
      expect(html).toContain('Test Item');
      expect(html).toContain('Test Description');
    });

    test('should render grid template', async () => {
      const component = editor.addComponent({
        type: 'data-dataGrid',
        config: {
          className: 'TestData',
          template: dataConfig.templates.grid.default,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('data-grid');
      expect(html).toContain('data-card');
      expect(html).toContain('Test Item');
    });

    test('should render form template', async () => {
      const component = editor.addComponent({
        type: 'data-dataForm',
        config: {
          className: 'TestData',
          template: dataConfig.templates.form.default,
          fields: [
            { name: 'title', label: 'Title', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'price', label: 'Price', type: 'number' },
          ],
        },
      });

      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('data-form');
      expect(html).toContain('input type="text"');
      expect(html).toContain('textarea');
      expect(html).toContain('required');
    });

    test('should render detail template', async () => {
      const component = editor.addComponent({
        type: 'data-dataDetail',
        config: {
          className: 'TestData',
          objectId: testData.id,
          template: dataConfig.templates.detail.default,
          fields: [
            { name: 'title', label: 'Title' },
            { name: 'description', label: 'Description' },
            { name: 'price', label: 'Price' },
            { name: 'date', label: 'Date', type: 'date' },
          ],
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('data-detail');
      expect(html).toContain('Test Item');
      expect(html).toContain('99.99');
    });
  });

  describe('Helper Functions', () => {
    test('should render field based on type', () => {
      const fields = [
        { name: 'text', type: 'text', required: true },
        { name: 'textarea', type: 'textarea' },
        {
          name: 'select',
          type: 'select',
          options: [
            { value: '1', label: 'One' },
            { value: '2', label: 'Two' },
          ],
        },
        { name: 'checkbox', type: 'checkbox' },
        { name: 'file', type: 'file' },
      ];

      fields.forEach(field => {
        const html = dataConfig.helpers.renderField(field);
        expect(html).toContain(field.name);

        if (field.type === 'select') {
          expect(html).toContain('option');
          expect(html).toContain('One');
          expect(html).toContain('Two');
        }

        if (field.required) {
          expect(html).toContain('required');
        }
      });
    });

    test('should render value based on type', () => {
      const date = new Date();
      const data = {
        text: 'Test Text',
        image: { url: 'test.jpg' },
        file: { url: 'test.pdf' },
        date: date,
        boolean: true,
        array: ['one', 'two'],
        pointer: new Parse.Object('TestClass', { title: 'Test' }),
      };

      const fields = [
        { name: 'text', type: 'text' },
        { name: 'image', type: 'image', label: 'Image' },
        { name: 'file', type: 'file', label: 'File' },
        { name: 'date', type: 'date' },
        { name: 'boolean', type: 'boolean' },
        { name: 'array', type: 'array' },
        { name: 'pointer', type: 'pointer', displayField: 'title' },
      ];

      fields.forEach(field => {
        const html = dataConfig.helpers.renderValue(data, field);

        switch (field.type) {
          case 'image':
            expect(html).toContain('<img');
            expect(html).toContain('test.jpg');
            break;
          case 'file':
            expect(html).toContain('<a');
            expect(html).toContain('test.pdf');
            break;
          case 'date':
            expect(html).toBe(date.toLocaleDateString());
            break;
          case 'boolean':
            expect(html).toBe('Yes');
            break;
          case 'array':
            expect(html).toBe('one, two');
            break;
        }
      });
    });

    test('should format date correctly', () => {
      const date = new Date('2023-01-01');
      const formatted = dataConfig.helpers.formatDate(date);
      expect(formatted).toBe('1/1/2023');
    });

    test('should format currency correctly', () => {
      const amount = 1234.56;
      const formatted = dataConfig.helpers.formatCurrency(amount);
      expect(formatted).toBe('$1,234.56');
    });
  });

  describe('Default Settings', () => {
    test('should apply pagination settings', async () => {
      // Create multiple test items
      for (let i = 0; i < 15; i++) {
        const item = new Parse.Object('TestData');
        item.set({
          title: `Item ${i}`,
          description: `Description ${i}`,
        });
        await item.save(null, { useMasterKey: true });
      }

      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestData',
          ...dataConfig.defaults.pagination,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      // Should only show first page
      const itemCount = (html.match(/Item \d+/g) || []).length;
      expect(itemCount).toBe(dataConfig.defaults.pagination.itemsPerPage);
    });

    test('should apply sorting settings', async () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestData',
          ...dataConfig.defaults.sorting,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const model = component.get('components').models[0];

      expect(model.get('sortField')).toBe('createdAt');
      expect(model.get('sortOrder')).toBe('desc');
    });

    test('should apply filtering settings', async () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestData',
          ...dataConfig.defaults.filtering,
          filters: [{ field: 'active', operator: 'equals', value: true }],
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      // Should only show active items
      expect(html).toContain('Test Item');
    });
  });

  describe('Styles', () => {
    test('should apply list styles', () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'TestData',
        },
      });

      const styles = editor.getStyle();
      expect(styles).toContain('.data-list');
      expect(styles).toContain('.data-item');
    });

    test('should apply grid styles', () => {
      const component = editor.addComponent({
        type: 'data-dataGrid',
        config: {
          className: 'TestData',
        },
      });

      const styles = editor.getStyle();
      expect(styles).toContain('.data-grid');
      expect(styles).toContain('.data-card');
    });

    test('should apply form styles', () => {
      const component = editor.addComponent({
        type: 'data-dataForm',
        config: {
          className: 'TestData',
        },
      });

      const styles = editor.getStyle();
      expect(styles).toContain('.data-form');
      expect(styles).toContain('.form-group');
    });
  });
});
