/**
 * Test Helpers
 * Provides utility functions and custom assertions for testing
 */

const fixtures = require('./fixtures/data');

/**
 * Custom test matchers
 */
expect.extend({
  toBeValidId(received) {
    const pass = typeof received === 'string' && received.length === 10;
    return {
      message: () => `expected ${received} to be a valid Parse Object ID`,
      pass,
    };
  },

  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    return {
      message: () => `expected ${received} to be a valid Date`,
      pass,
    };
  },

  toHaveACL(received) {
    const pass = received && received.getACL && received.getACL() !== null;
    return {
      message: () => `expected ${received} to have an ACL`,
      pass,
    };
  },
});

/**
 * Test Utilities
 */
class TestHelpers {
  constructor(Parse) {
    this.Parse = Parse;
  }

  /**
   * Create test user with role
   * @param {string} role - User role
   * @param {Object} attributes - Additional user attributes
   * @returns {Promise<Parse.User>} Created user
   */
  async createUserWithRole(role, attributes = {}) {
    const userData = fixtures.users[role] || fixtures.users.author;
    const user = new this.Parse.User();
    await user.signUp({
      ...userData,
      ...attributes,
    });
    await this.assignUserRole(user, role);
    return user;
  }

  /**
   * Assign role to user
   * @param {Parse.User} user - User to assign role to
   * @param {string} roleName - Role name
   * @returns {Promise<void>}
   */
  async assignUserRole(user, roleName) {
    const roleQuery = new this.Parse.Query(this.Parse.Role);
    roleQuery.equalTo('name', `cms-${roleName}`);
    let role = await roleQuery.first({ useMasterKey: true });

    if (!role) {
      role = new this.Parse.Role(`cms-${roleName}`, new this.Parse.ACL());
      await role.save(null, { useMasterKey: true });
    }

    role.getUsers().add(user);
    await role.save(null, { useMasterKey: true });
  }

  /**
   * Create test template
   * @param {string} type - Template type
   * @param {Object} attributes - Additional template attributes
   * @returns {Promise<Parse.Object>} Created template
   */
  async createTemplate(type, attributes = {}) {
    const templateData = fixtures.templates[type] || fixtures.templates.basicPage;
    const template = new this.Parse.Object('CMSTemplate');
    return await template.save(
      {
        ...templateData,
        ...attributes,
      },
      { useMasterKey: true }
    );
  }

  /**
   * Create test content
   * @param {Parse.User} user - Content creator
   * @param {string} type - Content type
   * @param {Object} attributes - Additional content attributes
   * @returns {Promise<Parse.Object>} Created content
   */
  async createContent(user, type, attributes = {}) {
    const contentData = fixtures.content[type] || fixtures.content.homepage;
    const template = await this.createTemplate(type);

    const content = new this.Parse.Object('CMSContent');
    return await content.save(
      {
        ...contentData,
        template,
        createdBy: user,
        organization: user,
        ...attributes,
      },
      { useMasterKey: true }
    );
  }

  /**
   * Create test media
   * @param {Parse.User} user - Media creator
   * @param {string} type - Media type
   * @param {Object} attributes - Additional media attributes
   * @returns {Promise<Parse.Object>} Created media
   */
  async createMedia(user, type, attributes = {}) {
    const mediaData = fixtures.media[type] || fixtures.media.image;
    const file = new this.Parse.File(mediaData.name, {
      base64: Buffer.from('test').toString('base64'),
    });
    await file.save();

    const media = new this.Parse.Object('CMSMedia');
    return await media.save(
      {
        ...mediaData,
        file,
        createdBy: user,
        organization: user,
        ...attributes,
      },
      { useMasterKey: true }
    );
  }

  /**
   * Create test webhook
   * @param {string} type - Webhook type
   * @param {Object} attributes - Additional webhook attributes
   * @returns {Promise<Parse.Object>} Created webhook
   */
  async createWebhook(type, attributes = {}) {
    const webhookData = fixtures.webhooks[type] || fixtures.webhooks.contentHook;
    const webhook = new this.Parse.Object('CMSWebhook');
    return await webhook.save(
      {
        ...webhookData,
        ...attributes,
      },
      { useMasterKey: true }
    );
  }

  /**
   * Wait for async operation
   * @param {Function} condition - Condition to wait for
   * @param {number} timeout - Timeout in milliseconds
   * @param {number} interval - Check interval in milliseconds
   * @returns {Promise<void>}
   */
  async waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) return;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
  }

  /**
   * Clean up test data
   * @returns {Promise<void>}
   */
  async cleanup() {
    const schemas = ['CMSContent', 'CMSTemplate', 'CMSMedia', 'CMSWebhook', '_User', '_Role'];

    const promises = schemas.map(schema => {
      const query = new this.Parse.Query(schema);
      return query
        .find({ useMasterKey: true })
        .then(objects => this.Parse.Object.destroyAll(objects, { useMasterKey: true }));
    });

    await Promise.all(promises);
  }

  /**
   * Create ACL for testing
   * @param {Parse.User} owner - Object owner
   * @param {string} type - ACL type
   * @returns {Parse.ACL} Created ACL
   */
  createACL(owner, type = 'public') {
    const aclData = fixtures.acl[type] || fixtures.acl.public;
    const acl = new this.Parse.ACL(owner);

    Object.entries(aclData).forEach(([key, permissions]) => {
      if (key === '*') {
        if (permissions.read) acl.setPublicReadAccess(true);
        if (permissions.write) acl.setPublicWriteAccess(true);
      } else if (key.startsWith('role:')) {
        const role = key.split(':')[1];
        if (permissions.read) acl.setRoleReadAccess(role, true);
        if (permissions.write) acl.setRoleWriteAccess(role, true);
      }
    });

    return acl;
  }
}

module.exports = TestHelpers;
