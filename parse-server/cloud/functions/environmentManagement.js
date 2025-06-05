module.exports = Parse => {
  const validateEnvironmentAccess = async request => {
    const { user } = request;
    const { applicationId } = request.params;

    if (!user) {
      throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
    }

    const application = await new Parse.Query('Application')
      .equalTo('objectId', applicationId)
      .first({ useMasterKey: true });

    if (!application) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Application not found');
    }

    // Rely on global Parse.Cloud.run, assuming isUserAdmin and isUserOrganizationAdmin are defined elsewhere
    const isAdmin = await Parse.Cloud.run('isUserAdmin', { user });
    const isOrgAdmin = await Parse.Cloud.run('isUserOrganizationAdmin', {
      user,
      organizationId: application.get('organizationId'),
    });

    if (!isAdmin && !isOrgAdmin) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'User does not have permission');
    }

    return application;
  };

  Parse.Cloud.define('getApplicationEnvironments', async request => {
    const application = await validateEnvironmentAccess(request);

    const environments = await new Parse.Query('Environment')
      .equalTo('application', application)
      .include('variables')
      .include('featureFlags')
      .find({ useMasterKey: true });

    if (environments.length === 0) {
      const defaultEnvironments = [
        { name: 'Development', type: 'development' },
        { name: 'Staging', type: 'staging' },
        { name: 'Production', type: 'production' },
      ];

      const Environment = Parse.Object.extend('Environment');
      const createdEnvironments = await Parse.Object.saveAll(
        defaultEnvironments.map(env => {
          const environment = new Environment();

          environment.set('name', env.name);
          environment.set('type', env.type);
          environment.set('application', application);
          environment.set('variables', []);
          environment.set('featureFlags', []);

          return environment;
        }),
        { useMasterKey: true }
      );

      return createdEnvironments.map(env => ({
        id: env.id,
        name: env.get('name'),
        type: env.get('type'),
        variables: [],
        featureFlags: [],
        settings: {},
      }));
    }

    return environments.map(env => ({
      id: env.id,
      name: env.get('name'),
      type: env.get('type'),
      variables: env.get('variables') || [],
      featureFlags: env.get('featureFlags') || [],
      settings: env.get('settings') || {},
    }));
  });

  Parse.Cloud.define('createEnvironmentVariable', async request => {
    const application = await validateEnvironmentAccess(request);
    const { environmentId, name, value, isSecret, description } = request.params;

    const environment = await new Parse.Query('Environment')
      .equalTo('objectId', environmentId)
      .equalTo('application', application)
      .first({ useMasterKey: true });

    if (!environment) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Environment not found');
    }

    const variables = environment.get('variables') || [];

    if (variables.some(v => v.name === name)) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Variable with this name already exists');
    }

    const variable = {
      id: new Parse.Object('_Variable').id, // Generate unique ID
      name,
      value: isSecret ? await Parse.Cloud.run('encryptValue', { value }) : value,
      isSecret,
      environment: environmentId,
      description,
    };

    environment.set('variables', [...variables, variable]);
    await environment.save(null, { useMasterKey: true });

    return variable;
  });

  Parse.Cloud.define('updateEnvironmentVariable', async request => {
    const application = await validateEnvironmentAccess(request);
    const { environmentId, variableId, name, value, isSecret, description } = request.params;

    const environment = await new Parse.Query('Environment')
      .equalTo('objectId', environmentId)
      .equalTo('application', application)
      .first({ useMasterKey: true });

    if (!environment) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Environment not found');
    }

    const variables = environment.get('variables') || [];
    const variableIndex = variables.findIndex(v => v.id === variableId);

    if (variableIndex === -1) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Variable not found');
    }

    if (variables.some(v => v.name === name && v.id !== variableId)) {
      throw new Parse.Error(Parse.Error.DUPLICATE_VALUE, 'Variable with this name already exists');
    }

    variables[variableIndex] = {
      ...variables[variableIndex],
      name,
      value: isSecret ? await Parse.Cloud.run('encryptValue', { value }) : value,
      isSecret,
      description,
    };

    environment.set('variables', variables);
    await environment.save(null, { useMasterKey: true });

    return variables[variableIndex];
  });

  Parse.Cloud.define('deleteEnvironmentVariable', async request => {
    const application = await validateEnvironmentAccess(request);
    const { environmentId, variableId } = request.params;

    const environment = await new Parse.Query('Environment')
      .equalTo('objectId', environmentId)
      .equalTo('application', application)
      .first({ useMasterKey: true });

    if (!environment) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Environment not found');
    }

    const variables = environment.get('variables') || [];
    const updatedVariables = variables.filter(v => v.id !== variableId);

    if (variables.length === updatedVariables.length) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Variable not found');
    }

    environment.set('variables', updatedVariables);
    await environment.save(null, { useMasterKey: true });

    return { success: true };
  });

  Parse.Cloud.define('createFeatureFlag', async request => {
    const application = await validateEnvironmentAccess(request);
    const { environmentId, name, enabled, description, conditions } = request.params;

    const environment = await new Parse.Query('Environment')
      .equalTo('objectId', environmentId)
      .equalTo('application', application)
      .first({ useMasterKey: true });

    if (!environment) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Environment not found');
    }

    const flags = environment.get('featureFlags') || [];

    if (flags.some(f => f.name === name)) {
      throw new Parse.Error(
        Parse.Error.DUPLICATE_VALUE,
        'Feature flag with this name already exists'
      );
    }

    const flag = {
      id: new Parse.Object('_Flag').id, // Generate unique ID
      name,
      enabled,
      environment: environmentId,
      description,
      conditions: conditions || [],
    };

    environment.set('featureFlags', [...flags, flag]);
    await environment.save(null, { useMasterKey: true });

    return flag;
  });

  Parse.Cloud.define('updateFeatureFlag', async request => {
    const application = await validateEnvironmentAccess(request);
    const { environmentId, flagId, name, enabled, description, conditions } = request.params;

    const environment = await new Parse.Query('Environment')
      .equalTo('objectId', environmentId)
      .equalTo('application', application)
      .first({ useMasterKey: true });

    if (!environment) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Environment not found');
    }

    const flags = environment.get('featureFlags') || [];
    const flagIndex = flags.findIndex(f => f.id === flagId);

    if (flagIndex === -1) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Feature flag not found');
    }

    if (flags.some(f => f.name === name && f.id !== flagId)) {
      throw new Parse.Error(
        Parse.Error.DUPLICATE_VALUE,
        'Feature flag with this name already exists'
      );
    }

    flags[flagIndex] = {
      ...flags[flagIndex],
      name,
      enabled,
      description,
      conditions: conditions || [],
    };

    environment.set('featureFlags', flags);
    await environment.save(null, { useMasterKey: true });

    return flags[flagIndex];
  });

  Parse.Cloud.define('deleteFeatureFlag', async request => {
    const application = await validateEnvironmentAccess(request);
    const { environmentId, flagId } = request.params;

    const environment = await new Parse.Query('Environment')
      .equalTo('objectId', environmentId)
      .equalTo('application', application)
      .first({ useMasterKey: true });

    if (!environment) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Environment not found');
    }

    const flags = environment.get('featureFlags') || [];
    const updatedFlags = flags.filter(f => f.id !== flagId);

    if (flags.length === updatedFlags.length) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Feature flag not found');
    }

    environment.set('featureFlags', updatedFlags);
    await environment.save(null, { useMasterKey: true });

    return { success: true };
  });

  // Helper function to encrypt sensitive values
  Parse.Cloud.define('encryptValue', async request => {
    const { value } = request.params;
    const crypto = require('crypto');

    const iv = await new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      });
    });

    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(value, 'utf8', 'hex');

    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      tag: authTag.toString('hex'),
    });
  });
};
