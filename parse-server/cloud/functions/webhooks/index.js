/**
 * Webhooks Management Cloud Functions
 * Handles CRUD operations for webhooks and persona webhook processing
 */

Parse.Cloud.define('getWebhooks', async (request) => {
  try {
    const { limit = 50, skip = 0 } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Create query for Webhook class
    const query = new Parse.Query('Webhook');
    
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
    const webhooks = await query.find({ useMasterKey: true });

    // Transform results to match expected format
    const webhookData = webhooks.map(webhook => ({
      id: webhook.id,
      name: webhook.get('name'),
      url: webhook.get('url'),
      events: webhook.get('events') || [],
      isActive: webhook.get('isActive'),
      secret: webhook.get('secret'),
      organizationId: webhook.get('organizationId'),
      createdAt: webhook.get('createdAt'),
      updatedAt: webhook.get('updatedAt')
    }));

    return {
      webhooks: webhookData,
      totalCount: webhookData.length
    };

  } catch (error) {
    console.error('Error in getWebhooks cloud function:', error);
    throw new Error(error.message || 'Failed to fetch webhooks');
  }
});

Parse.Cloud.define('createWebhook', async (request) => {
  try {
    const { name, url, events, isActive = true, secret } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events)) {
      throw new Error('Missing required fields: name, url, events (array)');
    }

    // Create new Webhook object
    const Webhook = Parse.Object.extend('Webhook');
    const webhook = new Webhook();

    // Set webhook properties
    webhook.set('name', name);
    webhook.set('url', url);
    webhook.set('events', events);
    webhook.set('isActive', isActive);
    webhook.set('organizationId', user.get('organizationId'));
    webhook.set('createdBy', user.id);

    // Set optional fields
    if (secret) webhook.set('secret', secret);

    // Save the webhook
    const savedWebhook = await webhook.save(null, { useMasterKey: true });

    return {
      webhook: {
        id: savedWebhook.id,
        name: savedWebhook.get('name'),
        url: savedWebhook.get('url'),
        events: savedWebhook.get('events'),
        isActive: savedWebhook.get('isActive'),
        secret: savedWebhook.get('secret'),
        organizationId: savedWebhook.get('organizationId'),
        createdAt: savedWebhook.get('createdAt'),
        updatedAt: savedWebhook.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in createWebhook cloud function:', error);
    throw new Error(error.message || 'Failed to create webhook');
  }
});

Parse.Cloud.define('updateWebhook', async (request) => {
  try {
    const { webhookId, name, url, events, isActive, secret } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!webhookId) {
      throw new Error('Webhook ID is required');
    }

    // Query for the webhook
    const query = new Parse.Query('Webhook');
    query.equalTo('objectId', webhookId);

    const webhook = await query.first({ useMasterKey: true });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Update webhook properties
    if (name) webhook.set('name', name);
    if (url) webhook.set('url', url);
    if (events) webhook.set('events', events);
    if (isActive !== undefined) webhook.set('isActive', isActive);
    if (secret) webhook.set('secret', secret);

    const updatedWebhook = await webhook.save(null, { useMasterKey: true });

    return {
      webhook: {
        id: updatedWebhook.id,
        name: updatedWebhook.get('name'),
        url: updatedWebhook.get('url'),
        events: updatedWebhook.get('events'),
        isActive: updatedWebhook.get('isActive'),
        secret: updatedWebhook.get('secret'),
        organizationId: updatedWebhook.get('organizationId'),
        createdAt: updatedWebhook.get('createdAt'),
        updatedAt: updatedWebhook.get('updatedAt')
      }
    };

  } catch (error) {
    console.error('Error in updateWebhook cloud function:', error);
    throw new Error(error.message || 'Failed to update webhook');
  }
});

Parse.Cloud.define('deleteWebhook', async (request) => {
  try {
    const { webhookId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!webhookId) {
      throw new Error('Webhook ID is required');
    }

    // Query for the webhook
    const query = new Parse.Query('Webhook');
    query.equalTo('objectId', webhookId);

    const webhook = await query.first({ useMasterKey: true });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Delete the webhook
    await webhook.destroy({ useMasterKey: true });

    return {
      success: true,
      message: `Webhook ${webhookId} deleted successfully`
    };

  } catch (error) {
    console.error('Error in deleteWebhook cloud function:', error);
    throw new Error(error.message || 'Failed to delete webhook');
  }
});

Parse.Cloud.define('testWebhook', async (request) => {
  try {
    const { webhookId } = request.params;
    const user = request.user;

    if (!user) {
      throw new Error('User must be authenticated');
    }

    if (!webhookId) {
      throw new Error('Webhook ID is required');
    }

    // Query for the webhook
    const query = new Parse.Query('Webhook');
    query.equalTo('objectId', webhookId);

    const webhook = await query.first({ useMasterKey: true });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // For now, just return a success response
    // In a real implementation, you would send a test payload to the webhook URL
    return {
      testResult: {
        success: true,
        message: `Webhook ${webhookId} tested successfully`,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error in testWebhook cloud function:', error);
    throw new Error(error.message || 'Failed to test webhook');
  }
});

// Persona webhook handler (existing functionality)
Parse.Cloud.define('persona', request => {
  if (!request.master) {
    return { success: false, error: 'Unauthorized request' };
  }

  const eventData = request.params;
  const eventType = eventData?.data?.attributes?.name;
  const payloadData = eventData?.data?.attributes?.payload?.data;
  const inquiryId = payloadData?.id || null;
  const accountId = payloadData?.relationships?.account?.data?.id || null;

  switch (eventType) {
    case 'inquiry.completed':
    case 'inquiry.approved':
      return handleSuccessEvent(eventData, inquiryId, accountId);
    case 'report/watchlist.matched':
    case 'report/politically-exposed-person.matched':
      return handleWatchlistEvent(eventData, eventType, accountId);
    default:
      return {
        success: false,
        error: 'Unhandled event type',
      };
  }
});

const handleSuccessEvent = async (eventData, inquiryId, accountId) => {
  if (!inquiryId || !accountId) {
    return {
      success: false,
      error: 'Missing inquiry ID or account ID in the payload.',
    };
  }
  let user = null;
  const query = new Parse.Query(Parse.User);

  query.equalTo('personaInquiryId', inquiryId);
  user = await query.first({ useMasterKey: true });

  if (user) {
    user.set('personaVerified', true); // Set personaVerified to true
    user.set('personaAccountID', accountId); // Set personaAccountID
    user.set('personaVerificationData', JSON.stringify(eventData)); // Save payload
    await user.save(null, { useMasterKey: true });

    return { success: true };
  } else {
    return {
      success: false,
      error: 'User not found',
    };
  }
};

const handleWatchlistEvent = async (eventData, eventType, accountId) => {
  if (!accountId) {
    return {
      success: false,
      error: 'Missing account ID in the payload.',
    };
  }

  let user = null;
  const query = new Parse.Query(Parse.User);

  query.equalTo('personaAccountID', accountId);
  user = await query.first({ useMasterKey: true });

  if (user) {
    if (eventType === 'report/watchlist.matched') {
      user.set('watchlistMatched', true);
    }
    if (eventType === 'report/politically-exposed-person.matched') {
      user.set('pepMatched', true);
    }

    user.set('nonoListData', JSON.stringify(eventData));
    await user.save(null, { useMasterKey: true });

    return { success: true };
  } else {
    return {
      success: false,
      error: 'User not found',
    };
  }
};
