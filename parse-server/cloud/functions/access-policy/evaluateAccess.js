/* global Parse */

const { evaluatePolicyRules } = require('./shared');

/**
 * Evaluate access based on policies
 */
Parse.Cloud.define('evaluateAccess', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { resource, action, context } = request.params;

  if (!resource || !action) {
    throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Resource and action are required');
  }

  try {
    // Get applicable policies
    const policies = await Parse.Cloud.run('getPolicies', {
      organization: context?.organization,
    });

    // Evaluate each policy's rules
    for (const policy of policies) {
      const result = await evaluatePolicyRules(policy.rules, {
        user: request.user,
        resource,
        action,
        context,
      });

      if (result !== null) {
        return {
          allowed: result,
          policyId: policy.objectId,
          resource,
          action,
        };
      }
    }

    // Default deny if no policy matches
    return {
      allowed: false,
      resource,
      action,
    };
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to evaluate access: ${error.message}`
    );
  }
});