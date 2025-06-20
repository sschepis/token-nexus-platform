const crypto = require('crypto');

/**
 * Create a new webhook
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.name - Webhook name
 * @param {string} request.params.url - Webhook endpoint URL
 * @param {string[]} request.params.events - Events to subscribe to
 * @param {string} request.params.method - HTTP method (default: POST)
 * @param {Object} request.params.headers - Custom headers
 * @param {string} request.params.secret - Optional webhook secret for signature verification
 * @returns {Object} Response with created webhook
 */
Parse.Cloud.define('createWebhook', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.name || !params.url || !params.events) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required fields: name, url, events');
    }

    // Get user's organization and verify permissions
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'User must be associated with an organization');
    }

    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User organization access not found');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canCreateWebhooks = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canCreateWebhooks) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to create webhooks');
    }

    // Validate URL
    if (!isValidUrl(params.url)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid webhook URL format');
    }

    // Validate events
    const validEvents = [
      'user.created', 'user.updated', 'user.deleted',
      'token.created', 'token.updated', 'token.transferred',
      'organization.updated', 'organization.member_added', 'organization.member_removed',
      'audit.log_created', 'notification.sent',
      'integration.created', 'integration.updated', 'integration.deleted'
    ];
    
    const invalidEvents = params.events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid events: ${invalidEvents.join(', ')}`);
    }

    // Generate webhook secret if not provided
    const webhookSecret = params.secret || crypto.randomBytes(32).toString('hex');

    // Create the webhook
    const Webhook = Parse.Object.extend('Webhook');
    const webhook = new Webhook();
    
    webhook.set('name', params.name.trim());
    webhook.set('url', params.url.trim());
    webhook.set('events', params.events);
    webhook.set('method', params.method || 'POST');
    webhook.set('headers', params.headers || {});
    webhook.set('secret', webhookSecret);
    webhook.set('orgId', orgId);
    webhook.set('isActive', true);
    webhook.set('status', 'active');
    webhook.set('createdBy', user.id);
    webhook.set('lastTriggered', null);
    webhook.set('successCount', 0);
    webhook.set('failureCount', 0);
    
    // Set ACL
    const acl = new Parse.ACL();
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    acl.setRoleReadAccess(`org_${orgId}_members`, true);
    acl.setRoleWriteAccess(`org_${orgId}_admins`, true);
    webhook.setACL(acl);
    
    await webhook.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'webhook_created');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Webhook');
    auditLog.set('resourceId', webhook.id);
    auditLog.set('details', {
      webhookName: params.name,
      url: params.url,
      events: params.events,
      method: params.method || 'POST'
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.get('name'),
        url: webhook.get('url'),
        events: webhook.get('events'),
        method: webhook.get('method'),
        headers: webhook.get('headers'),
        secret: webhookSecret, // Return secret only on creation
        isActive: webhook.get('isActive'),
        status: webhook.get('status'),
        createdAt: webhook.get('createdAt')?.toISOString(),
        createdBy: webhook.get('createdBy')
      }
    };

  } catch (error) {
    console.error('Error in createWebhook:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create webhook');
  }
});

/**
 * Get webhooks for the organization
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {boolean} request.params.activeOnly - Filter for active webhooks only
 * @param {number} request.params.limit - Pagination limit
 * @param {number} request.params.skip - Pagination skip
 * @returns {Object} Response with webhooks list
 */
Parse.Cloud.define('getWebhooks', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    const userQuery = new Parse.Query(Parse.User);
    const currentUser = await userQuery.get(user.id, { useMasterKey: true });
    const orgId = currentUser.get('currentOrgId');
    
    if (!orgId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'User must be associated with an organization');
    }

    // Build query
    const webhookQuery = new Parse.Query('Webhook');
    webhookQuery.equalTo('orgId', orgId);
    
    if (params.activeOnly === true) {
      webhookQuery.equalTo('isActive', true);
    }
    
    const limit = Math.min(params.limit || 50, 100);
    const skip = params.skip || 0;
    
    webhookQuery.limit(limit);
    webhookQuery.skip(skip);
    webhookQuery.descending('createdAt');
    
    const webhooks = await webhookQuery.find({ useMasterKey: true });
    
    // Transform webhooks (don't include secret in response)
    const transformedWebhooks = webhooks.map(webhook => ({
      id: webhook.id,
      name: webhook.get('name'),
      url: webhook.get('url'),
      events: webhook.get('events'),
      method: webhook.get('method'),
      headers: webhook.get('headers'),
      isActive: webhook.get('isActive'),
      status: webhook.get('status'),
      lastTriggered: webhook.get('lastTriggered')?.toISOString(),
      successCount: webhook.get('successCount') || 0,
      failureCount: webhook.get('failureCount') || 0,
      createdAt: webhook.get('createdAt')?.toISOString(),
      updatedAt: webhook.get('updatedAt')?.toISOString(),
      createdBy: webhook.get('createdBy')
    }));

    return {
      success: true,
      webhooks: transformedWebhooks
    };

  } catch (error) {
    console.error('Error in getWebhooks:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to fetch webhooks');
  }
});

/**
 * Update webhook
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.webhookId - Webhook ID to update
 * @param {string} request.params.name - Updated name
 * @param {string} request.params.url - Updated URL
 * @param {string[]} request.params.events - Updated events
 * @param {Object} request.params.headers - Updated headers
 * @param {boolean} request.params.isActive - Updated active status
 * @returns {Object} Response with updated webhook
 */
Parse.Cloud.define('updateWebhook', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.webhookId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: webhookId');
    }

    // Get the webhook
    const webhookQuery = new Parse.Query('Webhook');
    const webhook = await webhookQuery.get(params.webhookId, { useMasterKey: true });
    
    if (!webhook) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Webhook not found');
    }

    const orgId = webhook.get('orgId');
    
    // Verify user has access
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this webhook');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canUpdateWebhooks = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canUpdateWebhooks) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to update webhooks');
    }

    // Update fields if provided
    if (params.name !== undefined) {
      webhook.set('name', params.name.trim());
    }
    
    if (params.url !== undefined) {
      if (!isValidUrl(params.url)) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid webhook URL format');
      }
      webhook.set('url', params.url.trim());
    }
    
    if (params.events !== undefined) {
      const validEvents = [
        'user.created', 'user.updated', 'user.deleted',
        'token.created', 'token.updated', 'token.transferred',
        'organization.updated', 'organization.member_added', 'organization.member_removed',
        'audit.log_created', 'notification.sent',
        'integration.created', 'integration.updated', 'integration.deleted'
      ];
      
      const invalidEvents = params.events.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        throw new Parse.Error(Parse.Error.INVALID_QUERY, `Invalid events: ${invalidEvents.join(', ')}`);
      }
      
      webhook.set('events', params.events);
    }
    
    if (params.headers !== undefined) {
      webhook.set('headers', params.headers);
    }
    
    if (params.isActive !== undefined) {
      webhook.set('isActive', params.isActive);
      webhook.set('status', params.isActive ? 'active' : 'inactive');
    }
    
    webhook.set('updatedBy', user.id);
    await webhook.save(null, { useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'webhook_updated');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Webhook');
    auditLog.set('resourceId', webhook.id);
    auditLog.set('details', {
      webhookName: webhook.get('name'),
      url: webhook.get('url'),
      events: webhook.get('events'),
      isActive: webhook.get('isActive')
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      webhook: {
        id: webhook.id,
        name: webhook.get('name'),
        url: webhook.get('url'),
        events: webhook.get('events'),
        method: webhook.get('method'),
        headers: webhook.get('headers'),
        isActive: webhook.get('isActive'),
        status: webhook.get('status'),
        lastTriggered: webhook.get('lastTriggered')?.toISOString(),
        successCount: webhook.get('successCount') || 0,
        failureCount: webhook.get('failureCount') || 0,
        createdAt: webhook.get('createdAt')?.toISOString(),
        updatedAt: webhook.get('updatedAt')?.toISOString(),
        createdBy: webhook.get('createdBy'),
        updatedBy: webhook.get('updatedBy')
      }
    };

  } catch (error) {
    console.error('Error in updateWebhook:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update webhook');
  }
});

/**
 * Delete webhook
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.webhookId - Webhook ID to delete
 * @returns {Object} Response with success status
 */
Parse.Cloud.define('deleteWebhook', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.webhookId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: webhookId');
    }

    // Get the webhook
    const webhookQuery = new Parse.Query('Webhook');
    const webhook = await webhookQuery.get(params.webhookId, { useMasterKey: true });
    
    if (!webhook) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Webhook not found');
    }

    const orgId = webhook.get('orgId');
    
    // Verify user has access
    const orgUserQuery = new Parse.Query('OrgUser');
    orgUserQuery.equalTo('userId', user.id);
    orgUserQuery.equalTo('orgId', orgId);
    orgUserQuery.equalTo('isActive', true);
    
    const orgUser = await orgUserQuery.first({ sessionToken: user.getSessionToken() });
    if (!orgUser) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User does not have access to this webhook');
    }

    // Check permissions
    const userRoles = orgUser.get('roles') || [];
    const canDeleteWebhooks = userRoles.some(role => 
      ['admin', 'integration_manager', 'system_admin'].includes(role)
    );
    
    if (!canDeleteWebhooks) {
      throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Insufficient permissions to delete webhooks');
    }

    // Store webhook details for audit log
    const webhookDetails = {
      name: webhook.get('name'),
      url: webhook.get('url'),
      events: webhook.get('events')
    };

    // Delete the webhook
    await webhook.destroy({ useMasterKey: true });

    // Create audit log
    const AuditLog = Parse.Object.extend('AuditLog');
    const auditLog = new AuditLog();
    auditLog.set('action', 'webhook_deleted');
    auditLog.set('userId', user.id);
    auditLog.set('orgId', orgId);
    auditLog.set('resourceType', 'Webhook');
    auditLog.set('resourceId', params.webhookId);
    auditLog.set('details', {
      deletedWebhook: webhookDetails,
      deletedBy: user.id,
      deletedAt: new Date().toISOString()
    });
    await auditLog.save(null, { useMasterKey: true });

    return {
      success: true,
      message: 'Webhook deleted successfully'
    };

  } catch (error) {
    console.error('Error in deleteWebhook:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to delete webhook');
  }
});

/**
 * Test webhook by sending a test payload
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {string} request.params.webhookId - Webhook ID to test
 * @returns {Object} Response with test result
 */
Parse.Cloud.define('testWebhook', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    if (!params.webhookId) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing required field: webhookId');
    }

    // Get the webhook
    const webhookQuery = new Parse.Query('Webhook');
    const webhook = await webhookQuery.get(params.webhookId, { useMasterKey: true });
    
    if (!webhook) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'Webhook not found');
    }

    // Test the webhook
    const testResult = await triggerWebhook(webhook, 'webhook.test', {
      message: 'This is a test webhook payload',
      timestamp: new Date().toISOString(),
      testId: crypto.randomUUID()
    });

    return {
      success: true,
      testResult: testResult
    };

  } catch (error) {
    console.error('Error in testWebhook:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to test webhook');
  }
});

/**
 * Trigger a webhook with payload
 */
async function triggerWebhook(webhook, event, payload) {
  const axios = require('axios');
  
  try {
    const webhookPayload = {
      event: event,
      timestamp: new Date().toISOString(),
      data: payload,
      webhook: {
        id: webhook.id,
        name: webhook.get('name')
      }
    };

    // Generate signature if secret is provided
    const headers = { ...webhook.get('headers') };
    const secret = webhook.get('secret');
    
    if (secret) {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    headers['Content-Type'] = 'application/json';
    headers['User-Agent'] = 'TokenNexus-Webhook/1.0';

    const response = await axios({
      method: webhook.get('method') || 'POST',
      url: webhook.get('url'),
      headers: headers,
      data: webhookPayload,
      timeout: 30000
    });

    // Update success count
    webhook.increment('successCount');
    webhook.set('lastTriggered', new Date());
    await webhook.save(null, { useMasterKey: true });

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      responseTime: Date.now()
    };

  } catch (error) {
    // Update failure count
    webhook.increment('failureCount');
    webhook.set('lastTriggered', new Date());
    await webhook.save(null, { useMasterKey: true });

    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    };
  }
}

/**
 * Check if URL is valid
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}