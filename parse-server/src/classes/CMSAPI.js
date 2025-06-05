/**
 * CMS API Class
 * Manages API endpoints and configurations
 */

const Parse = require('parse/node');
const schema = require('../schema');

class CMSAPI extends Parse.Object {
  constructor() {
    super('CMSAPI');
  }

  static get className() {
    return 'CMSAPI';
  }

  static get schema() {
    return schema.CMSAPI;
  }

  /**
   * Initialize API
   */
  static async initialize(params) {
    const { name, description, organization, owner, config = {}, endpoints = [] } = params;

    const api = new CMSAPI();
    api.set('name', name);
    api.set('description', description);
    api.set('organization', organization);
    api.set('owner', owner);
    api.set('config', config);
    api.set('endpoints', endpoints);
    api.set('status', 'draft');

    return api.save(null, { useMasterKey: true });
  }

  /**
   * Add endpoint
   */
  async addEndpoint(endpoint) {
    const endpoints = this.get('endpoints') || [];
    endpoints.push(endpoint);
    this.set('endpoints', endpoints);
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Remove endpoint
   */
  async removeEndpoint(endpointId) {
    const endpoints = this.get('endpoints') || [];
    const index = endpoints.findIndex(e => e.id === endpointId);
    if (index > -1) {
      endpoints.splice(index, 1);
      this.set('endpoints', endpoints);
      return this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Update endpoint
   */
  async updateEndpoint(endpointId, updates) {
    const endpoints = this.get('endpoints') || [];
    const index = endpoints.findIndex(e => e.id === endpointId);
    if (index > -1) {
      endpoints[index] = { ...endpoints[index], ...updates };
      this.set('endpoints', endpoints);
      return this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Publish API
   */
  async publish() {
    this.set('status', 'published');
    this.set('publishedAt', new Date());
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Archive API
   */
  async archive() {
    this.set('status', 'archived');
    this.set('archivedAt', new Date());
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Clone API
   */
  async clone(newName) {
    const clone = new CMSAPI();

    // Copy basic info
    clone.set('name', newName);
    clone.set('description', this.get('description'));
    clone.set('organization', this.get('organization'));
    clone.set('owner', this.get('owner'));
    clone.set('config', this.get('config'));
    clone.set('endpoints', this.get('endpoints'));
    clone.set('status', 'draft');

    return clone.save(null, { useMasterKey: true });
  }

  /**
   * Before save trigger
   */
  static beforeSave(request) {
    const api = request.object;

    // Set timestamps
    if (!api.get('createdAt')) {
      api.set('createdAt', new Date());
    }
    api.set('updatedAt', new Date());

    // Validate name uniqueness within organization
    const name = api.get('name');
    const organization = api.get('organization');
    if (name && organization) {
      const query = new Parse.Query('CMSAPI');
      query.equalTo('name', name);
      query.equalTo('organization', organization);
      if (api.id) {
        query.notEqualTo('objectId', api.id);
      }
      return query.first({ useMasterKey: true }).then(existing => {
        if (existing) {
          throw new Error(`API with name "${name}" already exists in this organization`);
        }
      });
    }
  }
}

Parse.Object.registerSubclass('CMSAPI', CMSAPI);
module.exports = CMSAPI;
