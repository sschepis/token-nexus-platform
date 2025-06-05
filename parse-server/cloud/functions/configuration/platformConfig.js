// parse-server/cloud/functions/platformConfig.js

Parse.Cloud.define('updatePlatformConfig', async (request) => {
  // Require master key for this operation
  if (!request.master) {
    throw new Error('Master key required');
  }

  const { updates } = request.params;

  if (!updates) {
    throw new Error('No updates provided for PlatformConfig');
  }

  try {
    const PlatformConfig = Parse.Object.extend('PlatformConfig');
    const query = new Parse.Query(PlatformConfig);
    // Assuming there's only one PlatformConfig object
    let config = await query.first({ useMasterKey: true });

    if (!config) {
      config = new PlatformConfig();
    }

    Object.keys(updates).forEach(key => {
      config.set(key, updates[key]);
    });

    await config.save(null, { useMasterKey: true });

    return { success: true, message: 'PlatformConfig updated successfully.' };
  } catch (error) {
    console.error('Error updating PlatformConfig:', error);
    throw new Error(`Failed to update PlatformConfig: ${error.message}`);
  }
});

module.exports = {};