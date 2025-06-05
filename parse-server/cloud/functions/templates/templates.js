module.exports = Parse => {

 Parse.Cloud.define('getTemplates', async request => {
   if (!request.user) {
     throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
   }

   const query = new Parse.Query('CMSTemplate')
     .equalTo('status', 'active')
     .include('dependencies')
     .include('components')
     .include('apis')
     .include('triggers')
     .include('themes');

   const templates = await query.find({ useMasterKey: true });

   return templates;
 });

 Parse.Cloud.define('getTemplate', async request => {
   if (!request.user) {
     throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
   }

   const { templateId } = request.params;

   const query = new Parse.Query('CMSTemplate')
     .include('dependencies')
     .include('components')
     .include('apis')
     .include('triggers')
     .include('themes');

   const template = await query.get(templateId, { useMasterKey: true });

   if (!template) {
     throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Template not found');
   }

   return template;
 });

 Parse.Cloud.define('createTemplate', async request => {
   if (!request.user) {
     throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
   }

   const {
     name,
     description,
     type,
     version,
     dependencies,
     components,
     apis,
     triggers,
     themes,
     defaultConfiguration,
   } = request.params;

   const userRoles = await Parse.Cloud.run(
     'checkUserRole',
     { userId: request.user.id },
     { useMasterKey: true }
   );

   if (!userRoles.isAdmin) {
     throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only admins can create templates');
   }

   const Template = Parse.Object.extend('CMSTemplate');
   const template = new Template();

   template.set('name', name);
   template.set('description', description);
   template.set('type', type);
   template.set('version', version);
   template.set('dependencies', dependencies || []);
   template.set('components', components || []);
   template.set('apis', apis || []);
   template.set('triggers', triggers || []);
   template.set('themes', themes || []);
   template.set('defaultConfiguration', defaultConfiguration || {});
   template.set('status', 'active');
   template.set('createdBy', request.user);

   await template.save(null, { useMasterKey: true });

   return template;
 });

 Parse.Cloud.define('updateTemplate', async request => {
   if (!request.user) {
     throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
   }

   const {
     templateId,
     name,
     description,
     type,
     version,
     dependencies,
     components,
     apis,
     triggers,
     themes,
     defaultConfiguration,
     status,
   } = request.params;

   const userRoles = await Parse.Cloud.run(
     'checkUserRole',
     { userId: request.user.id },
     { useMasterKey: true }
   );

   if (!userRoles.isAdmin) {
     throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only admins can update templates');
   }

   const template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });

   if (!template) {
     throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Template not found');
   }

   if (name) template.set('name', name);
   if (description) template.set('description', description);
   if (type) template.set('type', type);
   if (version) template.set('version', version);
   if (dependencies) template.set('dependencies', dependencies);
   if (components) template.set('components', components);
   if (apis) template.set('apis', apis);
   if (triggers) template.set('triggers', triggers);
   if (themes) template.set('themes', themes);
   if (defaultConfiguration) template.set('defaultConfiguration', defaultConfiguration);
   if (status) template.set('status', status);
   template.set('updatedBy', request.user);

   await template.save(null, { useMasterKey: true });

   return template;
 });

 Parse.Cloud.define('deleteTemplate', async request => {
   if (!request.user) {
     throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
   }

   const { templateId } = request.params;

   const userRoles = await Parse.Cloud.run(
     'checkUserRole',
     { userId: request.user.id },
     { useMasterKey: true }
   );

   if (!userRoles.isAdmin) {
     throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Only admins can delete templates');
   }

   const template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });

   if (!template) {
     throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Template not found');
   }

   const applicationQuery = new Parse.Query('CMSApplication').equalTo('template', template);

   const hasApplications = (await applicationQuery.count({ useMasterKey: true })) > 0;

   if (hasApplications) {
     template.set('status', 'inactive');
     await template.save(null, { useMasterKey: true });

     return { success: true, message: 'Template marked as inactive' };
   }

   await template.destroy({ useMasterKey: true });

   return { success: true, message: 'Template deleted' };
 });

 Parse.Cloud.beforeSave('CMSTemplate', request => {
   if (!request.user) {
     throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
   }

   const template = request.object;

   if (!template.existed()) {
     const acl = new Parse.ACL();

     acl.setPublicReadAccess(true);
     acl.setRoleWriteAccess('admin', true);
     template.setACL(acl);
   }

   const name = template.get('name');
   const type = template.get('type');
   const version = template.get('version');

   if (!name) {
     throw new Parse.Error(Parse.Error.REQUIRED, 'Template name is required');
   }

   if (!type || !['custom', 'dynamic'].includes(type)) {
     throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid template type');
   }

   if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
     throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid version format (should be x.y.z)');
   }

   const dependencies = template.get('dependencies') || [];

   dependencies.forEach(dep => {
     if (!dep.name || !dep.version || !dep.type) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid dependency configuration');
     }

     if (!['component', 'api', 'trigger', 'theme'].includes(dep.type)) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid dependency type');
     }

     if (!dep.id) {
       dep.id = `${dep.type}_${dep.name}_${dep.version}`.replace(/[^a-zA-Z0-9_]/g, '_');
     }
   });
   template.set('dependencies', dependencies);

   const components = template.get('components') || [];

   components.forEach(comp => {
     if (!comp.name || !comp.type || !comp.configuration) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid component configuration');
     }
   });

   const apis = template.get('apis') || [];

   apis.forEach(api => {
     if (!api.name || !api.method || !api.path) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid API configuration');
     }

     if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(api.method)) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid API method');
     }
   });

   const triggers = template.get('triggers') || [];

   triggers.forEach(trigger => {
     if (!trigger.name || !trigger.type || !trigger.event || !trigger.action) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid trigger configuration');
     }

     if (!['data', 'workflow', 'integration', 'notification'].includes(trigger.type)) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid trigger type');
     }
   });

   const themes = template.get('themes') || [];

   themes.forEach(theme => {
     if (!theme.name || !theme.styles || !theme.components || !theme.variables) {
       throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid theme configuration');
     }
   });
 });

 Parse.Cloud.afterSave('CMSTemplate', async request => {
   const template = request.object;

   if (!template.existed() || template.dirty('dependencies')) {
     try {
       const validationResult = await Parse.Cloud.run('validateTemplateDependencies', {
         templateId: template.id,
       });

       template.set('dependencyValidation', validationResult);
       await template.save(null, { useMasterKey: true });

       if (!validationResult.isValid) {
         console.error('Template dependencies validation failed:', validationResult);
       }
     } catch (error) {
       console.error('Error validating template dependencies:', error);
     }
   }

   if (!template.existed()) {
     const collections = ['components', 'apis', 'triggers', 'themes'];

     for (const collection of collections) {
       const Collection = Parse.Object.extend(collection);
       const defaultItem = new Collection();

       defaultItem.set('template', template);
       defaultItem.set('name', 'Default');
       defaultItem.set('isDefault', true);
       await defaultItem.save(null, { useMasterKey: true });
     }
   }
 });
};
