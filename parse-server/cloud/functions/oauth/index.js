/**
 * OAuth Applications Management Cloud Functions
 * Handles CRUD operations for OAuth applications
 */

Parse.Cloud.define('getOAuthApps', async (request) => {
  try {
    const { limit = 50, skip = 0 } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Create query for OAuthApp class
    const query = new Parse.Query('OAuthApp');
    
    // Filter by user's organization if available
    if (user.get('organizationId')) {
      query.equalTo('organizationId', user.get('organizationId'));
    }

    // Set pagination
    query.limit(limit);
    query.skip(skip);

    // Order by creation date (newest first)
    query.descending('createdAt');

    // Execute query
    const oauthApps = await query.find({ useMasterKey: true });

    // Transform results to match expected format
    const oauthAppData = oauthApps.map(app => ({
      id: app.id,
      name: app.get('name'),
      clientId: app.get('clientId'),
      redirectUris: app.get('redirectUris') || [],
      description: app.get('description'),
      organizationId: app.get('organizationId'),
      createdAt: app.get('createdAt'),
      updatedAt: app.get('updatedAt')
    }));

    return {
      oauthApps: oauthAppData,
      totalCount: oauthAppData.length
    };

  } catch (error) {
    console.error('Error in getOAuthApps cloud function:', error);
    throw new Error(error.message || 'Failed to fetch OAuth Apps');
  }
});

Parse.Cloud.define('createOAuthApp', async (request) => {
  try {
    const { name, redirectUris, description } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Validate required fields
    if (!name || !redirectUris || !Array.isArray(redirectUris)) {
      throw new Error('Missing required fields: name, redirectUris (array)');
    }

    // Generate client ID and secret
    const clientId = `client_${Math.random().toString(36).substr(2, 16)}`;
    const clientSecret = `secret_${Math.random().toString(36).substr(2, 32)}`;

    // Create new OAuthApp object
    const OAuthApp = Parse.Object.extend('OAuthApp');
    const oauthApp = new OAuthApp();

    // Set OAuth app properties
    oauthApp.set('name', name);
    oauthApp.set('clientId', clientId);
    oauthApp.set('clientSecret', clientSecret);
    oauthApp.set('redirectUris', redirectUris);
    oauthApp.set('organizationId', user.get('organizationId'));
    oauthApp.set('createdBy', user.id);

    // Set optional fields
    if (description) oauthApp.set('description', description);

    // Save the OAuth app
    const savedOAuthApp = await oauthApp.save(null, { useMasterKey: true });

    return {
      oauthApp: {
        id: savedOAuthApp.id,
        name: savedOAuthApp.get('name'),
        clientId: savedOAuthApp.get('clientId'),
        clientSecret: savedOAuthApp.get('clientSecret'),
        redirectUris: savedOAuthApp.get('redirectUris'),
        description: savedOAuthApp.get('description'),
        organizationId: savedOAuthApp.get('organizationId'),
        createdAt: savedOAuthApp.get('createdAt'),
        updatedAt: savedOAuthApp.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in createOAuthApp cloud function:', error);
    throw new Error(error.message || 'Failed to create OAuth App');
  }
});

Parse.Cloud.define('updateOAuthApp', async (request) => {
  try {
    const { oauthAppId, name, redirectUris, description } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!oauthAppId) {
      throw new Error('OAuth App ID is required');
    }

    // Query for the OAuth app
    const query = new Parse.Query('OAuthApp');
    query.equalTo('objectId', oauthAppId);

    const oauthApp = await query.first({ useMasterKey: true });

    if (!oauthApp) {
      throw new Error('OAuth App not found');
    }

    // Update OAuth app properties
    if (name) oauthApp.set('name', name);
    if (redirectUris) oauthApp.set('redirectUris', redirectUris);
    if (description) oauthApp.set('description', description);

    const updatedOAuthApp = await oauthApp.save(null, { useMasterKey: true });

    return {
      oauthApp: {
        id: updatedOAuthApp.id,
        name: updatedOAuthApp.get('name'),
        clientId: updatedOAuthApp.get('clientId'),
        redirectUris: updatedOAuthApp.get('redirectUris'),
        description: updatedOAuthApp.get('description'),
        organizationId: updatedOAuthApp.get('organizationId'),
        createdAt: updatedOAuthApp.get('createdAt'),
        updatedAt: updatedOAuthApp.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in updateOAuthApp cloud function:', error);
    throw new Error(error.message || 'Failed to update OAuth App');
  }
});

Parse.Cloud.define('regenerateOAuthSecret', async (request) => {
  try {
    const { oauthAppId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!oauthAppId) {
      throw new Error('OAuth App ID is required');
    }

    // Query for the OAuth app
    const query = new Parse.Query('OAuthApp');
    query.equalTo('objectId', oauthAppId);

    const oauthApp = await query.first({ useMasterKey: true });

    if (!oauthApp) {
      throw new Error('OAuth App not found');
    }

    // Generate new client secret
    const newClientSecret = `secret_${Math.random().toString(36).substr(2, 32)}`;
    oauthApp.set('clientSecret', newClientSecret);

    await oauthApp.save(null, { useMasterKey: true });

    return {
      clientSecret: newClientSecret,
      message: 'OAuth secret regenerated successfully'
    };

  } catch (error) {
    console.error('Error in regenerateOAuthSecret cloud function:', error);
    throw new Error(error.message || 'Failed to regenerate OAuth secret');
  }
});

Parse.Cloud.define('deleteOAuthApp', async (request) => {
  try {
    const { oauthAppId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!oauthAppId) {
      throw new Error('OAuth App ID is required');
    }

    // Query for the OAuth app
    const query = new Parse.Query('OAuthApp');
    query.equalTo('objectId', oauthAppId);

    const oauthApp = await query.first({ useMasterKey: true });

    if (!oauthApp) {
      throw new Error('OAuth App not found');
    }

    // Delete the OAuth app
    await oauthApp.destroy({ useMasterKey: true });

    return {
      success: true,
      message: `OAuth App ${oauthAppId} deleted successfully`
    };

  } catch (error) {
    console.error('Error in deleteOAuthApp cloud function:', error);
    throw new Error(error.message || 'Failed to delete OAuth App');
  }
});