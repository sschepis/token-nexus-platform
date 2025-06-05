/**
 * Collaboration Cloud Functions
 * Handles real-time collaboration features
 */

const CollaborationService = require('../services/CollaborationService');
const LoggingService = require('../services/LoggingService');

/**
 * Initialize collaboration cloud functions
 */
function initialize() {
  // Start collaboration session
  Parse.Cloud.define('startCollaborationSession', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.documentId || !params.clientId) {
        throw new Error('Missing required parameters: documentId and clientId are required');
      }

      const session = await CollaborationService.startSession({
        documentId: params.documentId,
        userId: user.id,
        clientId: params.clientId,
        documentType: params.documentType || 'rich-text',
      });

      return session;
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'startCollaborationSession',
        user: request.user?.id,
      });
      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        'Failed to start collaboration session'
      );
    }
  });

  // End collaboration session
  Parse.Cloud.define('endCollaborationSession', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.sessionId) {
        throw new Error('Missing required parameter: sessionId');
      }

      await CollaborationService.endSession(params.sessionId);
      return { success: true };
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'endCollaborationSession',
        user: request.user?.id,
      });
      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        'Failed to end collaboration session'
      );
    }
  });

  // Apply change to document
  Parse.Cloud.define('applyChange', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.sessionId || !params.change || params.baseVersion === undefined) {
        throw new Error(
          'Missing required parameters: sessionId, change, and baseVersion are required'
        );
      }

      const result = await CollaborationService.applyChange({
        sessionId: params.sessionId,
        change: params.change,
        baseVersion: params.baseVersion,
      });

      return result;
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'applyChange',
        user: request.user?.id,
      });
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to apply change');
    }
  });

  // Lock document
  Parse.Cloud.define('lockDocument', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.documentId) {
        throw new Error('Missing required parameter: documentId');
      }

      const result = await CollaborationService.lockDocument({
        documentId: params.documentId,
        userId: user.id,
        duration: params.duration,
      });

      return result;
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'lockDocument',
        user: request.user?.id,
      });
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to lock document');
    }
  });

  // Get document presence
  Parse.Cloud.define('getDocumentPresence', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.documentId) {
        throw new Error('Missing required parameter: documentId');
      }

      const presence = CollaborationService.getPresence(params.documentId);
      return presence;
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'getDocumentPresence',
        user: request.user?.id,
      });
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get document presence');
    }
  });

  // Save document
  Parse.Cloud.define('saveDocument', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.documentId || !params.content) {
        throw new Error('Missing required parameters: documentId and content are required');
      }

      const query = new Parse.Query('Content');
      const document = await query.get(params.documentId, { useMasterKey: true });

      if (!document) {
        throw new Error('Document not found');
      }

      // Check if user has write permission
      const acl = document.getACL();
      if (!acl.getWriteAccess(user)) {
        throw new Parse.Error(
          Parse.Error.OPERATION_FORBIDDEN,
          'User does not have write permission'
        );
      }

      document.set('content', params.content);
      document.set('lastModifiedBy', user);
      await document.save(null, { useMasterKey: true });

      return { success: true };
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'saveDocument',
        user: request.user?.id,
      });
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to save document');
    }
  });

  // Subscribe to changes
  Parse.Cloud.define('subscribeToChanges', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.sessionId || !params.documentId) {
        throw new Error('Missing required parameters: sessionId and documentId are required');
      }

      const query = new Parse.Query('CollaborationChange');
      query.equalTo('documentId', params.documentId);
      const subscription = await query.subscribe();

      subscription.on('create', change => {
        // Emit change event to client
        Parse.Cloud.emit('collaborationChange', {
          sessionId: params.sessionId,
          change: change.get('change'),
        });
      });

      return { success: true };
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'subscribeToChanges',
        user: request.user?.id,
      });
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to subscribe to changes');
    }
  });

  // After save trigger for CollaborationChange
  Parse.Cloud.afterSave('CollaborationChange', async request => {
    try {
      const change = request.object;

      // Notify collaboration service
      CollaborationService.emit('change', {
        documentId: change.get('documentId'),
        change: change.get('change'),
      });
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationCloud',
        method: 'afterSave_CollaborationChange',
      });
    }
  });
}

module.exports = {
  initialize,
};
