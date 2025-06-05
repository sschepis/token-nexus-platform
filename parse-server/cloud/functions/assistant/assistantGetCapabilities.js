/* global Parse */

const { getCapabilitiesForTier } = require('./shared');

/**
 * Get assistant capabilities
 */
Parse.Cloud.define('assistant_get_capabilities', async request => {
  const { user } = request;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    const userSettings = await new Parse.Query('UserSettings')
      .equalTo('user', user)
      .first({ useMasterKey: true });

    const tier = userSettings?.get('assistantTier') || 'basic';

    // Get capabilities based on tier
    const capabilities = getCapabilitiesForTier(tier);

    return { capabilities };
  } catch (error) {
    throw new Parse.Error(
      Parse.Error.INTERNAL_SERVER_ERROR,
      'Error fetching assistant capabilities: ' + error.message
    );
  }
});