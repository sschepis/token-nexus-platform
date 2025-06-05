/* global Parse */

const getClassNameForType = type => {
  switch (type) {
    case 'component':
      return 'CMSComponent';
    case 'api':
      return 'CMSAPIEndpoint';
    case 'trigger':
      return 'CMSTrigger';
    default:
      return 'CMSTheme';
  }
};

const validateDependency = async dependency => {
  const result = {
    id: dependency.id,
    name: dependency.name,
    version: dependency.version,
    type: dependency.type,
    required: dependency.required,
  };

  try {
    const query = new Parse.Query(getClassNameForType(dependency.type));

    query.equalTo('name', dependency.name);
    const dep = await query.first({ useMasterKey: true });

    if (!dep) {
      result.status = 'error';
      result.message = 'Dependency not found';

      return { result, valid: 0, warnings: 0, errors: 1 };
    }

    const currentVersion = dep.get('version');
    const requiredVersion = dependency.version;

    if (currentVersion !== requiredVersion) {
      if (dependency.required) {
        result.status = 'error';
        result.message = `Version mismatch: required ${requiredVersion}, found ${currentVersion}`;

        return { result, valid: 0, warnings: 0, errors: 1 };
      }

      result.status = 'warning';
      result.message = `Version mismatch: recommended ${requiredVersion}, found ${currentVersion}`;

      return { result, valid: 0, warnings: 1, errors: 0 };
    }

    result.status = 'valid';
    result.details = {
      currentVersion,
      requiredVersion,
    };

    return { result, valid: 1, warnings: 0, errors: 0 };
  } catch (error) {
    result.status = 'error';
    result.message = error.message;

    return { result, valid: 0, warnings: 0, errors: 1 };
  }
};

Parse.Cloud.define('validateTemplateDependencies', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { templateId } = request.params;

  const template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });

  if (!template) {
    throw new Error('Template not found');
  }

  const dependencies = template.get('dependencies') || [];
  const validationResults = [];
  let totalValid = 0;
  let totalWarnings = 0;
  let totalErrors = 0;

  for (const dependency of dependencies) {
    const { result, valid, warnings, errors } = await validateDependency(dependency);

    validationResults.push(result);
    totalValid += valid;
    totalWarnings += warnings;
    totalErrors += errors;
  }

  return {
    isValid: totalErrors === 0,
    dependencies: validationResults,
    summary: {
      total: dependencies.length,
      valid: totalValid,
      warnings: totalWarnings,
      errors: totalErrors,
    },
  };
});

Parse.Cloud.define('validateApplicationDependencies', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  const { applicationId } = request.params;

  const application = await new Parse.Query('CMSApplication')
    .include('template')
    .get(applicationId, { useMasterKey: true });

  if (!application) {
    throw new Error('Application not found');
  }

  const template = application.get('template');

  if (!template) {
    return {
      isValid: true,
      dependencies: [],
      summary: {
        total: 0,
        valid: 0,
        warnings: 0,
        errors: 0,
      },
    };
  }

  const dependencies = template.get('dependencies') || [];
  const validationResults = [];
  let totalValid = 0;
  let totalWarnings = 0;
  let totalErrors = 0;

  for (const dependency of dependencies) {
    const { result, valid, warnings, errors } = await validateDependency(dependency);

    validationResults.push(result);
    totalValid += valid;
    totalWarnings += warnings;
    totalErrors += errors;
  }

  return {
    isValid: totalErrors === 0,
    dependencies: validationResults,
    summary: {
      total: dependencies.length,
      valid: totalValid,
      warnings: totalWarnings,
      errors: totalErrors,
    },
  };
});

Parse.Cloud.define('fixTemplateDependency', async request => {
  if (!request.user) {
    throw new Error('User must be authenticated');
  }

  // Check if user has admin permissions
  const userRoles = await Parse.Cloud.run(
    'checkUserRole',
    { userId: request.user.id },
    { useMasterKey: true }
  );

  if (!userRoles.isAdmin) {
    throw new Error('Admin access required');
  }

  const { templateId } = request.params;

  // Fetch template with masterKey since there's a beforeFind trigger requiring authentication
  const template = await new Parse.Query('CMSTemplate').get(templateId, { useMasterKey: true });

  if (!template) {
    throw new Error('Template not found');
  }

  const dependencies = template.get('dependencies') || [];

  // Find first missing dependency
  let dependency = null;

  for (const d of dependencies) {
    const DependencyClass = Parse.Object.extend(getClassNameForType(d.type));
    const query = new Parse.Query(DependencyClass);

    query.equalTo('name', d.name);

    const existing = await query.first({ useMasterKey: true });

    if (!existing) {
      dependency = d;
      break;
    }
  }

  if (!dependency) {
    throw new Error('No missing dependencies found');
  }

  // Create dependency with proper ACL
  const DependencyClass = Parse.Object.extend(getClassNameForType(dependency.type));
  const dep = new DependencyClass();
  const acl = new Parse.ACL();

  acl.setPublicReadAccess(true);
  acl.setRoleReadAccess('Administrator', true);
  acl.setRoleWriteAccess('Administrator', true);

  dep.set('name', dependency.name);
  dep.set('version', dependency.version);
  dep.set('type', dependency.type);
  dep.set('createdBy', request.user);
  dep.set('organization', request.user.get('organization'));
  dep.set('styles', {});
  dep.set('components', {});
  dep.set('variables', {});
  dep.setACL(acl);

  await dep.save(null, { useMasterKey: true });

  return {
    success: true,
    dependency: {
      name: dependency.name,
      version: dependency.version,
      type: dependency.type,
    },
  };
});
