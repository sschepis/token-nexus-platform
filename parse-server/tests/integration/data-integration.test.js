/**
 * Data Integration Tests
 * Tests integration between GrapesJS and Parse Server data components
 */

const {
  setupTestEnvironment,
  teardownTestEnvironment,
  createTestUser,
  helpers,
  Parse,
} = require('../setup');
const WebsiteBuilder = require('../../src/website-builder').default;

describe('Data Integration', () => {
  let editor;
  let builder;
  let user;
  let testProduct;
  let testOrder;

  beforeAll(async () => {
    await setupTestEnvironment();
    user = await createTestUser();

    // Create test schemas
    const productSchema = new Parse.Schema('Product');
    productSchema.addString('name');
    productSchema.addNumber('price');
    productSchema.addString('description');
    productSchema.addBoolean('inStock');
    await productSchema.save();

    const orderSchema = new Parse.Schema('Order');
    orderSchema.addString('orderNumber');
    orderSchema.addNumber('total');
    orderSchema.addPointer('user', '_User');
    orderSchema.addArray('items');
    await orderSchema.save();

    // Create test data
    testProduct = new Parse.Object('Product');
    testProduct.set({
      name: 'Test Product',
      price: 99.99,
      description: 'A test product',
      inStock: true,
    });
    await testProduct.save(null, { useMasterKey: true });

    testOrder = new Parse.Object('Order');
    testOrder.set({
      orderNumber: 'ORD-001',
      total: 99.99,
      user: user,
      items: [testProduct.id],
    });
    await testOrder.save(null, { useMasterKey: true });
  });

  afterAll(async () => {
    // Clean up test schemas
    const productSchema = new Parse.Schema('Product');
    await productSchema.delete();
    const orderSchema = new Parse.Schema('Order');
    await orderSchema.delete();
    await teardownTestEnvironment();
  });

  beforeEach(async () => {
    await helpers.cleanup();
    builder = new WebsiteBuilder({
      container: document.createElement('div'),
    });
    editor = builder.initialize();
  });

  describe('Data Component Integration', () => {
    test('should load Parse class data into component', async () => {
      const component = editor.addComponent({
        type: 'data-dataList',
        config: {
          className: 'Product',
          template: '<div class="product">{{name}} - ${{price}}</div>',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('Test Product');
      expect(html).toContain('99.99');
    });

    test('should handle relationships', async () => {
      const component = editor.addComponent({
        type: 'data-dataDetail',
        config: {
          className: 'Order',
          objectId: testOrder.id,
          template: `
            <div class="order">
              {{orderNumber}}
              <div class="user">{{user.username}}</div>
              <div class="items">
                {{#each items}}
                  <div class="item">{{this.name}}</div>
                {{/each}}
              </div>
            </div>
          `,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('ORD-001');
      expect(html).toContain(user.get('username'));
      expect(html).toContain('Test Product');
    });

    test('should update when data changes', async () => {
      const component = editor.addComponent({
        type: 'data-dataCard',
        config: {
          className: 'Product',
          objectId: testProduct.id,
          template: '<div class="product">{{name}} - ${{price}}</div>',
        },
      });

      // Update product
      testProduct.set('price', 149.99);
      await testProduct.save(null, { useMasterKey: true });

      // Wait for live query update
      await new Promise(resolve => setTimeout(resolve, 500));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('149.99');
    });
  });

  describe('Data Block Integration', () => {
    test('should render product grid block', async () => {
      // Add more test products
      for (let i = 0; i < 5; i++) {
        const product = new Parse.Object('Product');
        product.set({
          name: `Product ${i}`,
          price: 10 * (i + 1),
          description: `Description ${i}`,
          inStock: true,
        });
        await product.save(null, { useMasterKey: true });
      }

      const block = editor.addComponent({
        type: 'data-productGrid',
        config: {
          className: 'Product',
          query: {
            equalTo: { inStock: true },
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = block.get('components').models[0].toHTML();

      expect(html).toContain('product-grid');
      expect(html).toContain('Product 0');
      expect(html).toContain('Product 1');
    });

    test('should render stats dashboard block', async () => {
      // Add more test orders
      for (let i = 0; i < 5; i++) {
        const order = new Parse.Object('Order');
        order.set({
          orderNumber: `ORD-00${i + 2}`,
          total: 100 * (i + 1),
          user: user,
          items: [testProduct.id],
        });
        await order.save(null, { useMasterKey: true });
      }

      const block = editor.addComponent({
        type: 'data-statsGrid',
        config: {
          metrics: [
            {
              className: 'Order',
              type: 'count',
              label: 'Total Orders',
            },
            {
              className: 'Order',
              type: 'sum',
              field: 'total',
              label: 'Total Revenue',
            },
          ],
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = block.get('components').models[0].toHTML();

      expect(html).toContain('stats-grid');
      expect(html).toContain('6'); // Total orders (5 + 1)
      expect(html).toContain('1599.99'); // Total revenue
    });
  });

  describe('Form Integration', () => {
    test('should handle form submission', async () => {
      const component = editor.addComponent({
        type: 'data-dataForm',
        config: {
          className: 'Product',
          fields: ['name', 'price', 'description', 'inStock'],
        },
      });

      // Simulate form submission
      const formData = {
        name: 'New Product',
        price: 199.99,
        description: 'A new test product',
        inStock: true,
      };

      await component.get('components').models[0].submit(formData);

      // Verify product was created
      const query = new Parse.Query('Product');
      query.equalTo('name', 'New Product');
      const product = await query.first({ useMasterKey: true });

      expect(product).toBeDefined();
      expect(product.get('price')).toBe(199.99);
    });

    test('should handle form validation', async () => {
      const component = editor.addComponent({
        type: 'data-dataForm',
        config: {
          className: 'Product',
          fields: ['name', 'price'],
          validation: {
            name: { required: true },
            price: { required: true, min: 0 },
          },
        },
      });

      // Attempt invalid submission
      const formData = {
        name: '',
        price: -10,
      };

      await expect(component.get('components').models[0].submit(formData)).rejects.toThrow();

      // Verify no product was created
      const query = new Parse.Query('Product');
      query.equalTo('price', -10);
      const product = await query.first({ useMasterKey: true });

      expect(product).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle query errors', async () => {
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

    test('should handle template errors', async () => {
      const component = editor.addComponent({
        type: 'data-dataCard',
        config: {
          className: 'Product',
          objectId: testProduct.id,
          template: '{{invalidHelper this}}',
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const html = component.get('components').models[0].toHTML();

      expect(html).toContain('Error');
    });
  });

  describe('Performance', () => {
    test('should handle large datasets', async () => {
      // Create 100 test products
      const products = [];
      for (let i = 0; i < 100; i++) {
        const product = new Parse.Object('Product');
        product.set({
          name: `Product ${i}`,
          price: Math.random() * 1000,
          description: `Description ${i}`,
          inStock: Math.random() > 0.5,
        });
        products.push(product);
      }
      await Parse.Object.saveAll(products, { useMasterKey: true });

      const startTime = Date.now();
      const component = editor.addComponent({
        type: 'data-dataGrid',
        config: {
          className: 'Product',
          pagination: {
            enabled: true,
            itemsPerPage: 25,
          },
        },
      });

      await new Promise(resolve => setTimeout(resolve, 100));
      const endTime = Date.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(1000); // Should render in less than 1 second

      const html = component.get('components').models[0].toHTML();
      const productCount = (html.match(/Product \d+/g) || []).length;
      expect(productCount).toBe(25); // Should only render first page
    });
  });
});
