const Parse = require('parse/node');

/**
 * Update notification preferences for the current user
 * @param {Object} request - Parse Cloud Function request
 * @param {Object} request.params - Request parameters
 * @param {Object} request.params.preferences - Notification preferences object
 * @param {boolean} request.params.preferences.emailNotifications - Enable email notifications
 * @param {boolean} request.params.preferences.pushNotifications - Enable push notifications
 * @param {boolean} request.params.preferences.smsNotifications - Enable SMS notifications
 * @param {Object} request.params.preferences.types - Type-specific preferences
 * @param {boolean} request.params.preferences.types.system - Enable system notifications
 * @param {boolean} request.params.preferences.types.security - Enable security notifications
 * @param {boolean} request.params.preferences.types.usage - Enable usage notifications
 * @param {boolean} request.params.preferences.types.team - Enable team notifications
 * @param {string} request.params.preferences.quietHoursStart - Quiet hours start time (HH:MM format)
 * @param {string} request.params.preferences.quietHoursEnd - Quiet hours end time (HH:MM format)
 * @param {string} request.params.preferences.timezone - User timezone
 * @returns {Object} Response with updated preferences
 */
Parse.Cloud.define('updateNotificationPreferences', async (request) => {
  const { user, params } = request;
  
  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  try {
    // Validate required parameters
    if (!params.preferences || typeof params.preferences !== 'object') {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Missing or invalid preferences object');
    }

    const { preferences } = params;

    // Validate time format for quiet hours if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (preferences.quietHoursStart && !timeRegex.test(preferences.quietHoursStart)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid quietHoursStart format. Use HH:MM format');
    }
    if (preferences.quietHoursEnd && !timeRegex.test(preferences.quietHoursEnd)) {
      throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Invalid quietHoursEnd format. Use HH:MM format');
    }

    // Query existing notification preferences or create new one
    const preferencesQuery = new Parse.Query('NotificationPreferences');
    preferencesQuery.equalTo('userId', user.id);
    
    let userPreferences = await preferencesQuery.first({ sessionToken: user.getSessionToken() });
    
    if (!userPreferences) {
      // Create new preferences object
      const NotificationPreferences = Parse.Object.extend('NotificationPreferences');
      userPreferences = new NotificationPreferences();
      userPreferences.set('userId', user.id);
      
      // Set default preferences
      userPreferences.set('emailNotifications', true);
      userPreferences.set('pushNotifications', true);
      userPreferences.set('smsNotifications', false);
      userPreferences.set('types', {
        system: true,
        security: true,
        usage: true,
        team: true
      });
      userPreferences.set('quietHoursStart', '22:00');
      userPreferences.set('quietHoursEnd', '08:00');
      userPreferences.set('timezone', 'UTC');
      
      // Set ACL - only the user can read/write their preferences
      const acl = new Parse.ACL();
      acl.setReadAccess(user.id, true);
      acl.setWriteAccess(user.id, true);
      userPreferences.setACL(acl);
    }

    // Store previous preferences for audit log
    const previousPreferences = {
      emailNotifications: userPreferences.get('emailNotifications'),
      pushNotifications: userPreferences.get('pushNotifications'),
      smsNotifications: userPreferences.get('smsNotifications'),
      types: userPreferences.get('types'),
      quietHoursStart: userPreferences.get('quietHoursStart'),
      quietHoursEnd: userPreferences.get('quietHoursEnd'),
      timezone: userPreferences.get('timezone')
    };

    // Update preferences with provided values
    if (preferences.emailNotifications !== undefined) {
      userPreferences.set('emailNotifications', Boolean(preferences.emailNotifications));
    }
    if (preferences.pushNotifications !== undefined) {
      userPreferences.set('pushNotifications', Boolean(preferences.pushNotifications));
    }
    if (preferences.smsNotifications !== undefined) {
      userPreferences.set('smsNotifications', Boolean(preferences.smsNotifications));
    }
    
    // Update type-specific preferences
    if (preferences.types && typeof preferences.types === 'object') {
      const currentTypes = userPreferences.get('types') || {};
      const updatedTypes = { ...currentTypes };
      
      if (preferences.types.system !== undefined) {
        updatedTypes.system = Boolean(preferences.types.system);
      }
      if (preferences.types.security !== undefined) {
        updatedTypes.security = Boolean(preferences.types.security);
      }
      if (preferences.types.usage !== undefined) {
        updatedTypes.usage = Boolean(preferences.types.usage);
      }
      if (preferences.types.team !== undefined) {
        updatedTypes.team = Boolean(preferences.types.team);
      }
      
      userPreferences.set('types', updatedTypes);
    }
    
    // Update quiet hours and timezone
    if (preferences.quietHoursStart) {
      userPreferences.set('quietHoursStart', preferences.quietHoursStart);
    }
    if (preferences.quietHoursEnd) {
      userPreferences.set('quietHoursEnd', preferences.quietHoursEnd);
    }
    if (preferences.timezone) {
      userPreferences.set('timezone', preferences.timezone);
    }

    // Save the preferences
    const savedPreferences = await userPreferences.save(null, { sessionToken: user.getSessionToken() });

    // Create audit log entry
    try {
      const AuditLog = Parse.Object.extend('AuditLog');
      const auditLog = new AuditLog();
      auditLog.set('action', 'notification_preferences_updated');
      auditLog.set('userId', user.id);
      auditLog.set('resourceType', 'NotificationPreferences');
      auditLog.set('resourceId', savedPreferences.id);
      auditLog.set('details', {
        previousPreferences: previousPreferences,
        newPreferences: {
          emailNotifications: savedPreferences.get('emailNotifications'),
          pushNotifications: savedPreferences.get('pushNotifications'),
          smsNotifications: savedPreferences.get('smsNotifications'),
          types: savedPreferences.get('types'),
          quietHoursStart: savedPreferences.get('quietHoursStart'),
          quietHoursEnd: savedPreferences.get('quietHoursEnd'),
          timezone: savedPreferences.get('timezone')
        },
        updatedAt: new Date().toISOString()
      });
      await auditLog.save(null, { useMasterKey: true });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation if audit logging fails
    }

    // Format response
    const formattedPreferences = {
      id: savedPreferences.id,
      userId: savedPreferences.get('userId'),
      emailNotifications: savedPreferences.get('emailNotifications'),
      pushNotifications: savedPreferences.get('pushNotifications'),
      smsNotifications: savedPreferences.get('smsNotifications'),
      types: savedPreferences.get('types'),
      quietHoursStart: savedPreferences.get('quietHoursStart'),
      quietHoursEnd: savedPreferences.get('quietHoursEnd'),
      timezone: savedPreferences.get('timezone'),
      updatedAt: savedPreferences.get('updatedAt')?.toISOString(),
      createdAt: savedPreferences.get('createdAt')?.toISOString()
    };

    return {
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: formattedPreferences
    };

  } catch (error) {
    console.error('Error in updateNotificationPreferences:', error);
    
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update notification preferences');
  }
});