module.exports = Parse => {
  const Component = Parse.Object.extend('CMSComponent'); // Corrected class name

  Parse.Cloud.define('createComponent', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const {
      applicationId,
      name,
      description,
      category,
      type,
      code,
      styles,
      schema,
      preview,
      dependencies,
      isTemplate,
      templateConfig,
    } = request.params;

    const application = await new Parse.Query('CMSApplication').get(applicationId, {
      useMasterKey: true,
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const userOrg = request.user.get('organization');
    const appOrg = application.get('organization');

    if (userOrg.id !== appOrg.id) {
      throw new Error('User does not have permission to create components for this application');
    }

    const component = new Component();

    component.set({
      name,
      type,
      description,
      version: version || '1.0.0',
      props: props || {},
      style: style || {},
      events: events || [],
      template: template || '',
      isPublic: isPublic || false,
      status: 'draft',
      organization: userOrg,
      application,
      createdBy: request.user,
      updatedBy: request.user,
    });

    await component.save(null, { useMasterKey: true });

    return component;
  });

  Parse.Cloud.define('updateComponent', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { componentId, ...updates } = request.params;

    if (!componentId) {
      throw new Error('Component ID is required');
    }

    try {
      const query = new Parse.Query(Component);
      const component = await query.get(componentId, { useMasterKey: true });

      if (!component) {
        throw new Error('Component not found');
      }

      const userOrg = request.user.get('organization');
      const componentOrg = component.get('organization');

      if (userOrg.id !== componentOrg.id) {
        throw new Error('User does not have permission to update this component');
      }

      Object.entries(updates).forEach(([key, value]) => {
        component.set(key, value);
      });
      component.set('updatedBy', request.user);

      await component.save(null, { useMasterKey: true });

      return component;
    } catch (error) {
      throw new Error(`Failed to update component: ${error.message}`);
    }
  });

  Parse.Cloud.define('listComponents', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { applicationId, category, type } = request.params;

    const application = await new Parse.Query('CMSApplication').get(applicationId, {
      useMasterKey: true,
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const userOrg = request.user.get('organization');
    const appOrg = application.get('organization');

    if (userOrg.id !== appOrg.id) {
      throw new Error('Access denied');
    }

    const query = new Parse.Query(Component).equalTo('application', application).include('createdBy');

    if (category) query.equalTo('category', category);
    if (type) query.equalTo('type', type);

    const components = await query.find({ useMasterKey: true });

    return components;
  });

  Parse.Cloud.define('deleteComponent', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { componentId } = request.params;

    if (!componentId) {
      throw new Error('Component ID is required');
    }

    try {
      const query = new Parse.Query(Component)
        .include('application')
        .get(componentId, { useMasterKey: true });

      if (!query) {
        throw new Error('Component not found');
      }

      const component = await query;

      const userOrg = request.user.get('organization');
      const appOrg = component.get('application').get('organization');

      if (userOrg.id !== appOrg.id) {
        throw new Error('Access denied');
      }

      const usageQuery = new Parse.Query('ComponentUsage').equalTo('component', component);
      const usage = await usageQuery.first({ useMasterKey: true });

      if (usage) {
        throw new Error('Cannot delete component that is in use');
      }

      await component.destroy({ useMasterKey: true });
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete component: ${error.message}`);
    }
  });

  // New: Import component function from components/index.js
  Parse.Cloud.define('importComponent', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const { componentData, applicationId } = request.params;

    if (!componentData || !applicationId) {
      throw new Error('Component data and applicationId are required');
    }

    try {
      const applicationQuery = new Parse.Query('CMSApplication');
      const application = await applicationQuery.get(applicationId, { useMasterKey: true });

      if (!application) {
        throw new Error('Application not found');
      }

      const userOrg = request.user.get('organization');
      const appOrg = application.get('organization');

      if (userOrg.id !== appOrg.id) {
        throw new Error('User does not have permission to import components for this application');
      }

      const component = new Parse.Object('CMSComponent');
      const { name, type, description, version, props, style, events, template, isPublic } =
        componentData;

      component.set({
        name: `${name} (Imported)`,
        type,
        description,
        version: version || '1.0.0',
        props: props || {},
        style: style || {},
        events: events || [],
        template: template || '',
        isPublic: isPublic || false,
        status: 'draft',
        organization: userOrg,
        application,
        createdBy: request.user,
        updatedBy: request.user,
      });

      await component.save(null, { useMasterKey: true });

      return component;
    } catch (error) {
      throw new Error(`Failed to import component: ${error.message}`);
    }
  });


  Parse.Cloud.beforeSave('CMSComponent', async request => {
    if (!request.user) {
      throw new Error('User must be authenticated');
    }

    const component = request.object;

    if (!component.existed()) {
      const acl = new Parse.ACL();

      // Grant read/write access to the user who created it
      acl.setReadAccess(request.user, true);
      acl.setWriteAccess(request.user, true);

      // Grant read/write access to organization admins
      if (request.user.get('organization')) {
        acl.setRoleReadAccess(`org_${request.user.get('organization').id}_member`, true);
        acl.setRoleWriteAccess(`org_${request.user.get('organization').id}_admin`, true);
      }

      // If component is public, grant public read access
      if (component.get('isPublic')) {
        acl.setPublicReadAccess(true);
      }

      // Grant SystemAdmin full access explicitly if needed, but masterKey overrides all
      acl.setRoleReadAccess('SystemAdmin', true);
      acl.setRoleWriteAccess('SystemAdmin', true);

      component.setACL(acl);
    }
  });
};
