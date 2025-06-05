/* global Parse */

const { AccessPolicy, PolicyRule } = require('./shared');

/**
 * Update an existing access policy
 */
Parse.Cloud.define('updateAccessPolicy', async request => {
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

  const { policyId, updates } = request.params;

  try {
    // Get policy
    const policy = await new Parse.Query(AccessPolicy)
      .include('rules')
      .get(policyId, { useMasterKey: true });

    // Update policy fields
    if (updates.name) policy.set('name', updates.name);
    if (updates.description) policy.set('description', updates.description);
    if (updates.priority !== undefined) policy.set('priority', updates.priority);
    if (updates.status) policy.set('status', updates.status);

    // Update rules if provided
    if (updates.rules) {
      // Delete existing rules
      const query = new Parse.Query(PolicyRule);

      query.equalTo('policy', policy);
      const existingRules = await query.find({ useMasterKey: true });

      await Parse.Object.destroyAll(existingRules, { useMasterKey: true });

      // Create new rules
      const acl = policy.getACL();
      const policyRules = await Promise.all(
        updates.rules.map(rule => {
          const policyRule = new PolicyRule();

          policyRule.set({
            policy,
            resource: rule.resource,
            action: rule.action,
            effect: rule.effect || 'allow',
            conditions: rule.conditions || {},
            priority: rule.priority || 0,
          });
          policyRule.setACL(acl);

          return policyRule.save(null, { useMasterKey: true });
        })
      );

      return {
        policy: await policy.save(null, { useMasterKey: true }),
        rules: policyRules.map(rule => rule.toJSON()),
      };
    }

    return {
      policy: await policy.save(null, { useMasterKey: true }),
    };
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to update policy: ${error.message}`
    );
  }
});