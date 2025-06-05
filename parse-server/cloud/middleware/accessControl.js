/* global Parse */

const { config } = require('../imports');

/**
 * Check if platform is in initial setup mode (no users exist)
 */
async function isInitialSetupMode() {
  try {
    const userQuery = new Parse.Query(Parse.User);
    userQuery.limit(1);
    const userCount = await userQuery.count({ useMasterKey: true });
    return userCount === 0;
  } catch (error) {
    console.error('Error checking initial setup mode:', error);
    return false;
  }
}

/**
 * Register AI-related access control
 */
function registerAIAccessControl() {
  ['AIUsage', 'AIAlert', 'AISettings', 'Notification'].forEach(className => {
    Parse.Cloud.beforeFind(className, async request => {
      // Allow unrestricted access if using master key
      if (request.master) return;

      // Allow access during initial setup
      if (await isInitialSetupMode()) return;

      const user = request.user;

      if (!user) {
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Authentication required');
      }

      // Check if user is system admin or has admin role
      const userRoles = await Parse.Cloud.run(
        'checkUserRole',
        { userId: user.id },
        { useMasterKey: true }
      );

      if (userRoles.isAdmin) return;

      // For non-admin users, only show their organization's data
      const organization = await Parse.Cloud.run(
        'getOrganization',
        { userId: user.id },
        { useMasterKey: true }
      );

      if (!organization) {
        throw new Parse.Error(
          Parse.Error.OBJECT_NOT_FOUND,
          'User must be associated with an organization'
        );
      }

      request.query.equalTo('organization', organization);
    });
  });
}

/**
 * Register organization access control
 */
function registerOrganizationAccessControl() {
  Parse.Cloud.beforeFind('Organization', async request => {
    console.log('Organization beforeFind triggered');

    // Allow unrestricted access if using master key
    if (request.master) {
      console.log('Master key access granted');
      return;
    }

    // Allow unrestricted access if using admin key
    if (request.auth?.isMaster) {
      console.log('Admin key access granted');
      return;
    }

    // Allow access during initial setup
    if (await isInitialSetupMode()) {
      console.log('Initial setup mode - allowing access');
      return;
    }

    const user = request.user;
    console.log('User:', user);

    if (!user) {
      console.log('No user found in request');
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Authentication required');
    }

    if (user.get('username') === config.dashboard.users[0].user || user.get('isAdmin') === true) {
      console.log('System admin access granted');
      return; // Allow full access for system admins
    }

    console.log(`Checking roles for user: ${user.id}`);

    const userRoles = await Parse.Cloud.run(
      'checkUserRole',
      {
        userId: user.id,
      },
      { useMasterKey: true }
    );

    console.log('User roles result:', userRoles);

    if (userRoles.isAdmin) {
      console.log('User is admin via role check, allowing full access');
      return;
    }

    const accessibleOrgIds = userRoles.organizationRoles.map(role => role.organizationId);
    console.log('Accessible organization IDs:', accessibleOrgIds);

    if (accessibleOrgIds.length === 0) {
      console.log('No accessible organizations found');
      throw new Parse.Error(
        Parse.Error.OBJECT_NOT_FOUND,
        'User does not have access to any organizations'
      );
    }

    // Create a new query constraint
    const constraint = {
      objectId: {
        $in: accessibleOrgIds,
      },
    };

    // Apply the constraint to the original query
    if (!request.query.where) {
      request.query.where = constraint;
    } else {
      // If there are existing constraints, merge them
      const existingWhere =
        typeof request.query.where === 'string'
          ? JSON.parse(request.query.where)
          : request.query.where;

      request.query.where = {
        $and: [existingWhere, constraint],
      };
    }

    console.log(
      'Added organization access constraints to query:',
      JSON.stringify(request.query.where)
    );
  });
}

/**
 * Register CMS template access control
 */
function registerCMSTemplateAccessControl() {
  Parse.Cloud.beforeFind('CMSTemplate', async request => {
    // Allow unrestricted access if using master key
    if (request.master) return;

    // Allow access during initial setup
    if (await isInitialSetupMode()) return;

    const user = request.user;

    if (!user) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Authentication required');
    }

    // Check if user is system admin or has admin role
    const userRoles = await Parse.Cloud.run(
      'checkUserRole',
      { userId: user.id },
      { useMasterKey: true }
    );

    if (userRoles.isAdmin) return;

    // Regular users can only see active templates
    request.query.equalTo('status', 'active');
  });
}

/**
 * Register application-related access control
 */
function registerApplicationAccessControl() {
  const applicationClasses = [
    'CMSEnvironment',
    'CMSEnvironmentVariable',
    'CMSFeatureFlag',
    'CMSAPIEndpoint',
    'CMSTrigger',
    'CMSTheme',
    'InstalledApplication',
  ];

  applicationClasses.forEach(className => {
    Parse.Cloud.beforeFind(className, async request => {
      console.log(`${className} beforeFind triggered`);

      // Allow unrestricted access if using master key
      if (request.master) {
        console.log('Master key access granted');
        return;
      }

      // Allow unrestricted access if using admin key
      if (request.auth?.isMaster) {
        console.log('Admin key access granted');
        return;
      }

      // Allow access during initial setup
      if (await isInitialSetupMode()) {
        console.log('Initial setup mode - allowing access');
        return;
      }

      const user = request.user;

      if (!user) {
        console.log('No user found in request');
        throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Authentication required');
      }

      // System admins get full access
      if (user.get('username') === config.dashboard.users[0].user || user.get('isAdmin') === true) {
        console.log('System admin access granted');
        return;
      }

      // Get user's roles and accessible organizations
      const userRoles = await Parse.Cloud.run(
        'checkUserRole',
        { userId: user.id },
        { useMasterKey: true }
      );

      if (userRoles.isAdmin) {
        console.log('User is admin via role check, allowing full access');
        return;
      }

      const accessibleOrgIds = userRoles.organizationRoles.map(role => role.organizationId);

      if (accessibleOrgIds.length === 0) {
        console.log('No accessible organizations found');
        throw new Parse.Error(
          Parse.Error.OBJECT_NOT_FOUND,
          'User does not have access to any organizations'
        );
      }

      // Create a new query constraint
      const constraint = {
        'application.organization.objectId': {
          $in: accessibleOrgIds,
        },
      };

      // Apply the constraint to the original query
      if (!request.query.where) {
        request.query.where = constraint;
      } else {
        // If there are existing constraints, merge them
        const existingWhere =
          typeof request.query.where === 'string'
            ? JSON.parse(request.query.where)
            : request.query.where;

        request.query.where = {
          $and: [existingWhere, constraint],
        };
      }

      console.log(
        `Added ${className} access constraints to query:`,
        JSON.stringify(request.query.where)
      );
    });
  });
}

/**
 * Register all access control middleware
 */
function registerAccessControl() {
  registerAIAccessControl();
  registerOrganizationAccessControl();
  registerCMSTemplateAccessControl();
  registerApplicationAccessControl();
  
  console.log('✓ Access control middleware registered');
}

module.exports = {
  registerAccessControl,
};