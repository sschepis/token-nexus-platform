/**
 * Security Cloud Functions
 * Exposes security functionality through Parse Cloud Functions
 */

const SecurityService = require('../services/SecurityService');

/**
 * Initialize security cloud functions
 */
function initialize() {
  // Configure MFA
  Parse.Cloud.define('configureMFA', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.method || !params.enabled) {
        throw new Error('Missing required parameters: method and enabled are required');
      }

      const MFASettings = Parse.Object.extend('MFASettings');
      const query = new Parse.Query(MFASettings);
      query.equalTo('userId', user.id);

      let settings = await query.first({ useMasterKey: true });

      if (!settings) {
        settings = new MFASettings();
        settings.set('userId', user.id);
      }

      settings.set('method', params.method);
      settings.set('enabled', params.enabled);

      if (params.method === 'totp') {
        // Generate TOTP secret if enabling
        if (params.enabled) {
          const secret = await SecurityService.generateTOTPSecret();
          settings.set('totpSecret', secret);
          return { success: true, secret };
        }
      }

      await settings.save(null, { useMasterKey: true });
      return { success: true };
    } catch (error) {
      console.error('MFA configuration error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to configure MFA');
    }
  });

  // Verify MFA token
  Parse.Cloud.define('verifyMFAToken', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.token || !params.method) {
        throw new Error('Missing required parameters: token and method are required');
      }

      const result = await SecurityService.validateAuthFactors({
        userId: user.id,
        totpToken: params.method === 'totp' ? params.token : undefined,
        deviceToken: params.method === 'device' ? params.token : undefined,
      });

      return result;
    } catch (error) {
      console.error('MFA verification error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to verify MFA token');
    }
  });

  // Add WAF rule
  Parse.Cloud.define('addWAFRule', async request => {
    try {
      const { user, params } = request;

      // Ensure user has admin permission
      if (!user || !user.get('isAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin permission required');
      }

      // Validate required parameters
      if (!params.name || !params.rule) {
        throw new Error('Missing required parameters: name and rule are required');
      }

      SecurityService.addRule(params.name, params.rule);
      return { success: true };
    } catch (error) {
      console.error('WAF rule addition error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to add WAF rule');
    }
  });

  // Update IP blacklist
  Parse.Cloud.define('updateIPBlacklist', async request => {
    try {
      const { user, params } = request;

      // Ensure user has admin permission
      if (!user || !user.get('isAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin permission required');
      }

      // Validate required parameters
      if (!params.ip || params.block === undefined) {
        throw new Error('Missing required parameters: ip and block are required');
      }

      SecurityService.updateBlacklist(params.ip, params.block);
      return { success: true };
    } catch (error) {
      console.error('IP blacklist update error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update IP blacklist');
    }
  });

  // Update IP whitelist
  Parse.Cloud.define('updateIPWhitelist', async request => {
    try {
      const { user, params } = request;

      // Ensure user has admin permission
      if (!user || !user.get('isAdmin')) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin permission required');
      }

      // Validate required parameters
      if (!params.ip || params.allow === undefined) {
        throw new Error('Missing required parameters: ip and allow are required');
      }

      SecurityService.updateWhitelist(params.ip, params.allow);
      return { success: true };
    } catch (error) {
      console.error('IP whitelist update error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to update IP whitelist');
    }
  });

  // Before save trigger for User
  Parse.Cloud.beforeSave(Parse.User, async request => {
    try {
      const user = request.object;

      // Only process if password is being set/changed
      if (user.isNew() || user.dirty('password')) {
        const password = user.get('password');

        // Validate password strength
        if (!SecurityService.validatePasswordStrength(password)) {
          throw new Error('Password does not meet security requirements');
        }
      }
    } catch (error) {
      throw new Parse.Error(Parse.Error.VALIDATION_ERROR, error.message);
    }
  });

  // After logout trigger for Session
  Parse.Cloud.afterLogout(async request => {
    try {
      // Store IP address in session logs if IP logging is enabled
      if (SecurityService.config.authentication?.session?.ipLogging) {
        const SessionLog = Parse.Object.extend('SessionLog');
        const log = new SessionLog();
        log.set('sessionToken', request.object.get('sessionToken'));
        log.set('userId', request.object.get('user')?.id);
        log.set('ip', request.ip);
        log.set('action', 'logout');
        await log.save(null, { useMasterKey: true });
      }
    } catch (error) {
      console.error('Session logout logging error:', error);
    }
  });

  // Before save trigger for all objects
  Parse.Cloud.beforeSave('*', async request => {
    try {
      const object = request.object;

      // Sanitize HTML content in text fields
      for (const field of Object.keys(object.attributes)) {
        const value = object.get(field);
        if (typeof value === 'string' && value.includes('<')) {
          object.set(field, SecurityService.sanitizeHTML(value));
        }
      }
    } catch (error) {
      console.error('Content sanitization error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to sanitize content');
    }
  });
}

module.exports = {
  initialize,
};
