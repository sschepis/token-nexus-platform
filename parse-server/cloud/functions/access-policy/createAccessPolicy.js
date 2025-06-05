/* global Parse */

const { AccessPolicy, PolicyRule } = require('./shared');

/**
 * Create a new access policy
 */
Parse.Cloud.define('createAccessPolicy', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  // Check admin access
  const userRoles = await Parse.Cloud.run(
    'checkUserRole',
    { userId: request.user.id },
    { useMasterKey: true }
  );

  if (!userRoles.isAdmin) {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin access required');
  }

  const { name, description, rules, priority, organization } = request.params;

  // Validate policy
  if (!name || !rules || !Array.isArray(rules)) {
    throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Invalid policy parameters');
  }

  try {
    // Create policy
    const policy = new AccessPolicy();

    policy.set({
      name,
      description,
      priority: priority || 0,
      status: 'active',
      organization: organization
        ? { __type: 'Pointer', className: 'Organization', objectId: organization }
        : null,
      createdBy: request.user,
    });

    // Set ACL
    const acl = new Parse.ACL();

    acl.setRoleReadAccess('admin', true);
    acl.setRoleWriteAccess('admin', true);
    if (organization) {
      acl.setRoleReadAccess(`org_${organization}_admin`, true);
      acl.setRoleWriteAccess(`org_${organization}_admin`, true);
    }
    policy.setACL(acl);

    await policy.save(null, { useMasterKey: true });

    // Create rules
    const policyRules = await Promise.all(
      rules.map(rule => {
        const policyRule = new PolicyRule();

        policyRule.set({
          policy,
          resource: rule.resource,
          action: rule.action,
          effect: rule.effect || 'allow',
          conditions: rule.conditions || {},
          priority: rule.priority || 0,
        });

        // Set ACL for rule
        policyRule.setACL(acl);

        return policyRule.save(null, { useMasterKey: true });
      })
    );

    return {
      policy: policy.toJSON(),
      rules: policyRules.map(rule => rule.toJSON()),
    };
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to create policy: ${error.message}`
    );
  }
});