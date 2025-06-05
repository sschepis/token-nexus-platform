/**
 * CMS Application Class
 * Manages application structure and components
 */

const Parse = require('parse/node');
const schema = require('../schema');

class CMSApplication extends Parse.Object {
  constructor() {
    super('CMSApplication');
  }

  static get className() {
    return 'CMSApplication';
  }

  static get schema() {
    return schema.CMSApplication;
  }

  /**
   * Initialize application
   */
  static async initialize(params) {
    const {
      name,
      description,
      organization,
      owner,
      config = {},
      theme = {},
      settings = {},
    } = params;

    const app = new CMSApplication();
    app.set('name', name);
    app.set('description', description);
    app.set('slug', this.generateSlug(name));
    app.set('organization', organization);
    app.set('owner', owner);
    app.set('config', config);
    app.set('theme', theme);
    app.set('settings', settings);

    return app.save(null, { useMasterKey: true });
  }

  /**
   * Add page to application
   */
  async addPage(page) {
    const pages = this.get('pages') || [];
    if (!pages.includes(page.id)) {
      pages.push(page.id);
      this.set('pages', pages);
      await this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Add API to application
   */
  async addAPI(api) {
    const apis = this.get('apis') || [];
    if (!apis.includes(api.id)) {
      apis.push(api.id);
      this.set('apis', apis);
      await this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Add trigger to application
   */
  async addTrigger(trigger) {
    const triggers = this.get('triggers') || [];
    if (!triggers.includes(trigger.id)) {
      triggers.push(trigger.id);
      this.set('triggers', triggers);
      await this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Add workflow to application
   */
  async addWorkflow(workflow) {
    const workflows = this.get('workflows') || [];
    if (!workflows.includes(workflow.id)) {
      workflows.push(workflow.id);
      this.set('workflows', workflows);
      await this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Add report to application
   */
  async addReport(report) {
    const reports = this.get('reports') || [];
    if (!reports.includes(report.id)) {
      reports.push(report.id);
      this.set('reports', reports);
      await this.save(null, { useMasterKey: true });
    }
    return this;
  }

  /**
   * Update navigation
   */
  async updateNavigation(navigation) {
    this.set('navigation', {
      ...this.get('navigation'),
      ...navigation,
    });
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Publish application
   */
  async publish() {
    this.set('status', 'published');
    this.set('publishedAt', new Date());
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Archive application
   */
  async archive() {
    this.set('status', 'archived');
    this.set('archivedAt', new Date());
    return this.save(null, { useMasterKey: true });
  }

  /**
   * Clone application
   */
  async clone(newName) {
    const clone = new CMSApplication();

    // Copy basic info
    clone.set('name', newName);
    clone.set('description', this.get('description'));
    clone.set('slug', CMSApplication.generateSlug(newName));
    clone.set('organization', this.get('organization'));
    clone.set('owner', this.get('owner'));
    clone.set('isPublic', this.get('isPublic'));
    clone.set('roles', this.get('roles'));

    // Copy configuration
    clone.set('config', this.get('config'));
    clone.set('theme', this.get('theme'));
    clone.set('settings', this.get('settings'));
    clone.set('navigation', this.get('navigation'));

    await clone.save(null, { useMasterKey: true });

    // Clone components
    await Promise.all([
      this.clonePages(clone),
      this.cloneAPIs(clone),
      this.cloneTriggers(clone),
      this.cloneWorkflows(clone),
      this.cloneReports(clone),
    ]);

    return clone;
  }

  /**
   * Generate URL-friendly slug
   */
  static generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Before save trigger
   */
  static beforeSave(request) {
    const app = request.object;

    // Set timestamps
    if (!app.get('createdAt')) {
      app.set('createdAt', new Date());
    }
    app.set('updatedAt', new Date());

    // Validate slug uniqueness
    const slug = app.get('slug');
    if (slug) {
      const query = new Parse.Query('CMSApplication');
      query.equalTo('slug', slug);
      if (app.id) {
        query.notEqualTo('objectId', app.id);
      }
      return query.first({ useMasterKey: true }).then(existing => {
        if (existing) {
          throw new Error(`Application with slug "${slug}" already exists`);
        }
      });
    }
  }

  /**
   * After delete trigger
   */
  static async afterDelete(request) {
    const app = request.object;

    // Delete all associated components
    const components = [
      ...(app.get('pages') || []),
      ...(app.get('apis') || []),
      ...(app.get('triggers') || []),
      ...(app.get('workflows') || []),
      ...(app.get('reports') || []),
    ];

    await Parse.Object.destroyAll(
      components.map(id => new Parse.Object(id)),
      { useMasterKey: true }
    );
  }
}

Parse.Object.registerSubclass('CMSApplication', CMSApplication);
module.exports = CMSApplication;
