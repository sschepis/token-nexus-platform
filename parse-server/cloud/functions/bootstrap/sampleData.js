// Sample data seeding cloud functions

/**
 * Seed sample app for demonstration purposes
 * Creates a sample task manager app definition and version
 */
Parse.Cloud.define('seedSampleApp', async (request) => {
  // Require master key or system admin
  const user = request.user;
  if (!request.master && (!user || !user.get('isAdmin'))) {
    throw new Error('Unauthorized');
  }

  try {
    const AppDefinition = Parse.Object.extend('AppDefinition');
    const AppVersion = Parse.Object.extend('AppVersion');
    
    // Create a sample app definition
    const sampleApp = new AppDefinition();
    sampleApp.set('name', 'Task Manager');
    sampleApp.set('description', 'A simple task management application for teams');
    sampleApp.set('publisher', 'Platform Team');
    sampleApp.set('category', 'Productivity');
    sampleApp.set('icon', 'https://example.com/task-manager-icon.png');
    sampleApp.set('features', [
      'Create and assign tasks',
      'Set due dates and priorities',
      'Track task progress',
      'Team collaboration'
    ]);
    sampleApp.set('isActive', true);
    sampleApp.set('isFeatured', true);
    
    const appACL = new Parse.ACL();
    appACL.setPublicReadAccess(true);
    appACL.setRoleWriteAccess('SystemAdmin', true);
    sampleApp.setACL(appACL);
    
    const savedApp = await sampleApp.save(null, { useMasterKey: true });
    
    // Create initial version
    const appVersion = new AppVersion();
    appVersion.set('appDefinition', savedApp);
    appVersion.set('version', '1.0.0');
    appVersion.set('changelog', 'Initial release');
    appVersion.set('status', 'published');
    appVersion.set('bundleUrl', 'https://example.com/bundles/task-manager-v1.0.0.zip');
    appVersion.set('publishedAt', new Date());
    appVersion.set('publishedBy', user || null);
    
    await appVersion.save(null, { useMasterKey: true });
    
    // Update app with current version
    savedApp.set('currentVersion', appVersion);
    await savedApp.save(null, { useMasterKey: true });
    
    return {
      success: true,
      appId: savedApp.id,
      message: 'Sample app created successfully'
    };
    
  } catch (error) {
    console.error('Seed sample app error:', error);
    throw error;
  }
});

module.exports = {};