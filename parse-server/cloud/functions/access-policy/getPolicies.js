/* global Parse */

const { AccessPolicy } = require('./shared');

/**
 * Get policies for evaluation
 */
Parse.Cloud.define('getPolicies', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { organization } = request.params;

  try {
    const query = new Parse.Query(AccessPolicy)
      .include('rules')
      .equalTo('status', 'active')
      .ascending('priority');

    if (organization) {
      query.equalTo('organization', {
        __type: 'Pointer',
        className: 'Organization',
        objectId: organization,
      });
    }

    const policies = await query.find({ useMasterKey: true });

    return policies.map(policy => ({
      ...policy.toJSON(),
      rules: policy
        .get('rules')
        .map(rule => rule.toJSON())
        .sort((a, b) => a.priority - b.priority),
    }));
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      `Failed to fetch policies: ${error.message}`
    );
  }
});