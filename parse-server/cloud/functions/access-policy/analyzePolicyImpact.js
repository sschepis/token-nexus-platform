/* global Parse */

const { AccessPolicy } = require('./shared');

/**
 * Analyze policy impact
 */
Parse.Cloud.define('analyzePolicyImpact', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { policyId } = request.params;

  try {
    // Get policy with rules
    const policy = await new Parse.Query(AccessPolicy)
      .include('rules')
      .get(policyId, { useMasterKey: true });

    // Get affected roles
    const affectedRoles = [];

    for (const rule of policy.get('rules')) {
      const conditions = rule.get('conditions');

      if (conditions.role) {
        const roleQuery = new Parse.Query(Parse.Role);

        roleQuery.equalTo('name', conditions.role);
        const role = await roleQuery.first({ useMasterKey: true });

        if (role) {
          affectedRoles.push({
            name: role.getName(),
            userCount: await role.getUsers().query().count({ useMasterKey: true }),
          });
        }
      }
    }

    // Get affected resources
    const affectedResources = [...new Set(policy.get('rules').map(rule => rule.get('resource')))];

    // Get conflicting policies
    const conflictQuery = new Parse.Query(AccessPolicy)
      .include('rules')
      .notEqualTo('objectId', policy.id)
      .equalTo('status', 'active');

    if (policy.get('organization')) {
      conflictQuery.equalTo('organization', policy.get('organization'));
    }

    const potentialConflicts = await conflictQuery.find({ useMasterKey: true });
    const conflicts = potentialConflicts.filter(otherPolicy => {
      const otherRules = otherPolicy.get('rules');

      return policy
        .get('rules')
        .some(rule =>
          otherRules.some(
            otherRule =>
              rule.get('resource') === otherRule.get('resource') &&
              rule.get('action') === otherRule.get('action') &&
              rule.get('effect') !== otherRule.get('effect')
          )
        );
    });

    return {
      policy: policy.toJSON(),
      impact: {
        affectedRoles,
        affectedResources,
        conflicts: conflicts.map(conflict => ({
          id: conflict.id,
          name: conflict.get('name'),
          priority: conflict.get('priority'),
        })),
      },
    };
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to analyze policy impact: ${error.message}`
    );
  }
});