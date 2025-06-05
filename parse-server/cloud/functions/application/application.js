module.exports = Parse => {
  const Application = Parse.Object.extend('CMSApplication');

  async function createApplication(request) {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { name, description, type, templateId, templateConfiguration } = request.params;

    const application = new Application();

    if (templateId) {
      const template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });

      if (!template) {
        throw new Error('Template not found');
      }

      application.set('name', name || template.get('name'));
      application.set('description', description || template.get('description'));
      application.set('type', type || template.get('type'));
      application.set('status', 'draft');
      application.set('version', template.get('version'));
      application.set('createdBy', request.user);
      application.set('updatedBy', request.user);
      application.set('template', template);
      application.set('components', template.get('components'));
      application.set('content', template.get('content'));
      application.set('configuration', templateConfiguration || template.get('defaultConfiguration'));
      application.set('isTemplate', false);
    } else {
      application.set('name', name);
      application.set('description', description);
      application.set('type', type);
      application.set('status', 'draft');
      application.set('version', '0.1.0');
      application.set('createdBy', request.user);
      application.set('updatedBy', request.user);
      application.set('isTemplate', false);
    }

    application.set('settings', {
      notifications: {
        enabled: true,
        email: true,
        push: false,
      },
      security: {
        twoFactorAuth: false,
        ipWhitelist: [],
      },
      performance: {
        cacheEnabled: true,
        maxConcurrentRequests: 100,
      },
    });

    await application.save(null, { useMasterKey: true });

    return application;
  }

  async function getApplication(request) {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { id } = request.params;
    const query = new Parse.Query(Application);

    query.include('createdBy');
    query.include('template');

    const application = await query.get(id, { useMasterKey: true });

    return application;
  }

  async function listApplications(request) {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const query = new Parse.Query(Application);

    query.include('createdBy');
    query.include('template');
    query.descending('createdAt');

    const applications = await query.find({ useMasterKey: true });

    return applications;
  }

  async function finalizeApplication(request) {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { id } = request.params;
    const query = new Parse.Query(Application);
    const application = await query.get(id, { useMasterKey: true });

    const components = application.get('components') || [];
    const apis = application.get('apis') || [];
    const triggers = application.get('triggers') || [];
    const themes = application.get('themes') || [];

    if (components.length === 0) {
      throw new Error('Application must have at least one component');
    }

    application.set('status', 'active');
    await application.save(null, { useMasterKey: true });

    const Deployment = Parse.Object.extend('Deployment');
    const deployment = new Deployment();

    deployment.set('application', application);
    deployment.set('version', application.get('version'));
    deployment.set('status', 'success');
    deployment.set('components', components);
    deployment.set('apis', apis);
    deployment.set('triggers', triggers);
    deployment.set('themes', themes);
    await deployment.save(null, { useMasterKey: true });

    return application;
  }

  async function afterSaveApplication(request) {
    const application = request.object;

    if (!application.existed()) {
      const collections = ['components', 'apis', 'triggers', 'themes'];

      for (const collection of collections) {
        const Collection = Parse.Object.extend(collection);
        const defaultItem = new Collection();

        defaultItem.set('application', application);
        defaultItem.set('name', 'Default');
        defaultItem.set('isDefault', true);
        await defaultItem.save(null, { useMasterKey: true });
      }
    }
  }

  // Register cloud functions
  Parse.Cloud.define('createApplication', createApplication);
  Parse.Cloud.define('getApplication', getApplication);
  Parse.Cloud.define('listApplications', listApplications);
  Parse.Cloud.define('finalizeApplication', finalizeApplication);

  // Register hooks
  Parse.Cloud.beforeSave('CMSApplication', request => {
    const application = request.object;
    const isTemplate = application.get('isTemplate');

    if (!application.existed()) {
      const createdBy = application.get('createdBy');

      if (!createdBy) {
        throw new Error('CreatedBy field is required');
      }

      if (isTemplate) {
        const acl = new Parse.ACL();

        acl.setPublicReadAccess(true);
        application.setACL(acl);
      } else {
        if (!application.get('organization')) {
          throw new Error('Organization field is required for non-template applications');
        }
        const acl = new Parse.ACL();

        acl.setPublicReadAccess(true);
        application.setACL(acl);
      }
    }
  });
  Parse.Cloud.afterSave('CMSApplication', afterSaveApplication);

  // Export functions if needed, although Parse.Cloud.define registers them globally
  // module.exports = {
  //   createApplication,
  //   getApplication,
  //   listApplications,
  //   finalizeApplication,
  // };
};
