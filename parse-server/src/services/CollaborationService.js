/**
 * Collaboration Service
 * Handles real-time collaboration features like shared editing and document locking
 */

const config = require('../config');
const LoggingService = require('./LoggingService');
const { EventEmitter } = require('events');

class CollaborationService extends EventEmitter {
  constructor() {
    super();
    // Default configuration if none provided
    const defaultConfig = {
      enabled: false,
      maxBufferSize: 100,
      presence: {
        enabled: true,
        cleanupInterval: 60000, // 1 minute
      },
      locking: {
        enabled: true,
        defaultDuration: 300000, // 5 minutes
      },
    };

    this.config = config.collaboration || defaultConfig;
    this.initialized = false;
    this.activeSessions = new Map();
    this.documentLocks = new Map();
    this.changeBuffers = new Map();
    this.presenceInfo = new Map();
  }

  /**
   * Initialize the collaboration service
   */
  async initialize() {
    // If collaboration is not configured, just mark as initialized but disabled
    if (!this.config || !this.config.enabled) {
      LoggingService.log('system', 'info', 'Collaboration service is disabled');
      this.initialized = true;
      return;
    }

    try {
      // Initialize Parse Live Query for real-time updates
      await this._initializeLiveQuery();

      // Initialize document tracking
      await this._initializeDocumentTracking();

      // Initialize presence system if enabled
      if (this.config.presence?.enabled) {
        this._initializePresence();
      }

      this.initialized = true;
      LoggingService.log('system', 'info', 'Collaboration service initialized successfully');
    } catch (error) {
      LoggingService.trackError(error, { service: 'CollaborationService', method: 'initialize' });
      // Don't throw error, just mark as not initialized
      this.initialized = false;
    }
  }

  /**
   * Start editing session
   * @param {Object} params Session parameters
   * @returns {Promise<Object>} Session information
   */
  async startSession(params) {
    if (!this.initialized) {
      throw new Error('Collaboration service is not initialized');
    }

    const { documentId, userId, clientId, documentType } = params;

    try {
      // Check document lock
      await this._checkDocumentLock(documentId);

      // Create session
      const session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentId,
        userId,
        clientId,
        documentType,
        startedAt: new Date(),
        changes: [],
        version: await this._getCurrentVersion(documentId),
      };

      this.activeSessions.set(session.id, session);
      this.changeBuffers.set(session.id, []);

      // Update presence information
      this._updatePresence(documentId, userId, 'active');

      // Subscribe to document changes
      await this._subscribeToChanges(session);

      return session;
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationService',
        method: 'startSession',
        params,
      });
      throw error;
    }
  }

  /**
   * End editing session
   * @param {string} sessionId Session ID
   */
  async endSession(sessionId) {
    if (!this.initialized) {
      throw new Error('Collaboration service is not initialized');
    }

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      // Flush any pending changes
      await this._flushChanges(sessionId);

      // Update presence information
      this._updatePresence(session.documentId, session.userId, 'inactive');

      // Clean up session
      this.activeSessions.delete(sessionId);
      this.changeBuffers.delete(sessionId);

      // Release lock if held
      await this._releaseLock(session.documentId, session.userId);

      this.emit('sessionEnded', { sessionId, documentId: session.documentId });
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationService',
        method: 'endSession',
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Apply change to document
   * @param {Object} params Change parameters
   * @returns {Promise<Object>} Updated document version
   */
  async applyChange(params) {
    if (!this.initialized) {
      throw new Error('Collaboration service is not initialized');
    }

    const { sessionId, change, baseVersion } = params;

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Invalid session');
      }

      // Validate change
      if (!this._validateChange(change, session)) {
        throw new Error('Invalid change');
      }

      // Check version conflicts
      if (baseVersion !== session.version) {
        throw new Error('Version conflict');
      }

      // Buffer the change
      this.changeBuffers.get(sessionId).push({
        ...change,
        timestamp: new Date(),
        userId: session.userId,
      });

      // Auto-flush if buffer is full
      if (this.changeBuffers.get(sessionId).length >= this.config.maxBufferSize) {
        await this._flushChanges(sessionId);
      }

      // Update session version
      session.version++;

      // Broadcast change to other clients
      this._broadcastChange(session.documentId, change);

      return { version: session.version };
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationService',
        method: 'applyChange',
        params,
      });
      throw error;
    }
  }

  /**
   * Lock document for exclusive access
   * @param {Object} params Lock parameters
   * @returns {Promise<boolean>} Lock success
   */
  async lockDocument(params) {
    if (!this.initialized) {
      throw new Error('Collaboration service is not initialized');
    }

    const { documentId, userId, duration = 300000 } = params; // Default 5 minutes

    try {
      const currentLock = this.documentLocks.get(documentId);
      if (currentLock && currentLock.expiresAt > Date.now()) {
        if (currentLock.userId !== userId) {
          throw new Error('Document is locked by another user');
        }
        // Extend existing lock
        currentLock.expiresAt = Date.now() + duration;
        return true;
      }

      // Create new lock
      this.documentLocks.set(documentId, {
        userId,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + duration,
      });

      // Schedule lock release
      setTimeout(() => {
        this._releaseLock(documentId, userId);
      }, duration);

      return true;
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationService',
        method: 'lockDocument',
        params,
      });
      throw error;
    }
  }

  /**
   * Get document presence information
   * @param {string} documentId Document ID
   * @returns {Array} Active users
   */
  getPresence(documentId) {
    if (!this.initialized) {
      throw new Error('Collaboration service is not initialized');
    }

    return Array.from(this.presenceInfo.get(documentId) || []);
  }

  /**
   * Initialize Live Query
   * @private
   */
  _checkAvailability() {
    if (!this.initialized || !this.config.enabled) {
      throw new Error('Collaboration service is not available');
    }
  }

  /**
   * Initialize Live Query
   * @private
   */
  async _initializeLiveQuery() {
    const query = new Parse.Query('CollaborationChange');
    query.subscribe();

    // Handle incoming changes
    query.on('create', change => {
      this._handleRemoteChange(change);
    });
  }

  /**
   * Initialize document tracking
   * @private
   */
  async _initializeDocumentTracking() {
    // Set up schema for collaboration changes
    const schema = new Parse.Schema('CollaborationChange');
    try {
      await schema.get();
    } catch (error) {
      await schema
        .addString('documentId')
        .addString('userId')
        .addString('sessionId')
        .addObject('change')
        .addNumber('version')
        .addDate('timestamp')
        .save();
    }
  }

  /**
   * Initialize presence system
   * @private
   */
  _initializePresence() {
    // Clean up inactive users periodically
    setInterval(() => {
      for (const [documentId, users] of this.presenceInfo.entries()) {
        const activeUsers = users.filter(user => this._isUserActive(documentId, user.userId));
        this.presenceInfo.set(documentId, activeUsers);
      }
    }, this.config.presence.cleanupInterval);
  }

  /**
   * Subscribe to document changes
   * @param {Object} session Session information
   * @private
   */
  async _subscribeToChanges(session) {
    const query = new Parse.Query('CollaborationChange');
    query.equalTo('documentId', session.documentId);
    query.subscribe();

    query.on('create', change => {
      if (change.get('sessionId') !== session.id) {
        this._handleRemoteChange(change);
      }
    });
  }

  /**
   * Handle remote change
   * @param {Object} change Change object
   * @private
   */
  _handleRemoteChange(change) {
    const documentId = change.get('documentId');
    const sessions = Array.from(this.activeSessions.values()).filter(
      session => session.documentId === documentId
    );

    sessions.forEach(session => {
      if (session.id !== change.get('sessionId')) {
        this.emit('remoteChange', {
          sessionId: session.id,
          change: change.get('change'),
        });
      }
    });
  }

  /**
   * Flush changes to database
   * @param {string} sessionId Session ID
   * @private
   */
  async _flushChanges(sessionId) {
    const changes = this.changeBuffers.get(sessionId) || [];
    if (changes.length === 0) return;

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // Save changes to database
      const Change = Parse.Object.extend('CollaborationChange');
      await Parse.Object.saveAll(
        changes.map(change => {
          const changeObj = new Change();
          return changeObj.save({
            documentId: session.documentId,
            userId: session.userId,
            sessionId: session.id,
            change,
            version: session.version,
            timestamp: change.timestamp,
          });
        }),
        { useMasterKey: true }
      );

      // Clear buffer
      this.changeBuffers.set(sessionId, []);
    } catch (error) {
      LoggingService.trackError(error, {
        service: 'CollaborationService',
        method: '_flushChanges',
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Broadcast change to other clients
   * @param {string} documentId Document ID
   * @param {Object} change Change object
   * @private
   */
  _broadcastChange(documentId, change) {
    this.emit('change', {
      documentId,
      change,
    });
  }

  /**
   * Check document lock
   * @param {string} documentId Document ID
   * @private
   */
  async _checkDocumentLock(documentId) {
    const lock = this.documentLocks.get(documentId);
    if (lock && lock.expiresAt > Date.now()) {
      throw new Error('Document is locked');
    }
  }

  /**
   * Release document lock
   * @param {string} documentId Document ID
   * @param {string} userId User ID
   * @private
   */
  async _releaseLock(documentId, userId) {
    const lock = this.documentLocks.get(documentId);
    if (lock && lock.userId === userId) {
      this.documentLocks.delete(documentId);
      this.emit('lockReleased', { documentId, userId });
    }
  }

  /**
   * Get current document version
   * @param {string} documentId Document ID
   * @returns {Promise<number>} Current version
   * @private
   */
  async _getCurrentVersion(documentId) {
    const query = new Parse.Query('CollaborationChange');
    query.equalTo('documentId', documentId);
    query.descending('version');
    query.limit(1);

    const latest = await query.first({ useMasterKey: true });
    return latest ? latest.get('version') + 1 : 0;
  }

  /**
   * Validate change object
   * @param {Object} change Change object
   * @param {Object} session Session information
   * @returns {boolean} Validation result
   * @private
   */
  _validateChange(change, session) {
    // Basic validation
    if (!change || typeof change !== 'object') return false;

    // Type-specific validation
    switch (session.documentType) {
      case 'text':
        return this._validateTextChange(change);
      case 'rich-text':
        return this._validateRichTextChange(change);
      case 'structured':
        return this._validateStructuredChange(change);
      default:
        return false;
    }
  }

  /**
   * Validate text change
   * @param {Object} change Change object
   * @returns {boolean} Validation result
   * @private
   */
  _validateTextChange(change) {
    return (
      typeof change.position === 'number' &&
      (typeof change.insert === 'string' || typeof change.delete === 'number')
    );
  }

  /**
   * Validate rich text change
   * @param {Object} change Change object
   * @returns {boolean} Validation result
   * @private
   */
  _validateRichTextChange(change) {
    return (
      Array.isArray(change.ops) &&
      change.ops.every(
        op =>
          typeof op === 'object' &&
          (op.insert || op.delete || op.retain) &&
          (!op.attributes || typeof op.attributes === 'object')
      )
    );
  }

  /**
   * Validate structured change
   * @param {Object} change Change object
   * @returns {boolean} Validation result
   * @private
   */
  _validateStructuredChange(change) {
    return typeof change.path === 'string' && (change.value !== undefined || change.unset === true);
  }

  /**
   * Update presence information
   * @param {string} documentId Document ID
   * @param {string} userId User ID
   * @param {string} status User status
   * @private
   */
  _updatePresence(documentId, userId, status) {
    let users = this.presenceInfo.get(documentId) || [];
    users = users.filter(user => user.userId !== userId);

    if (status === 'active') {
      users.push({
        userId,
        status,
        lastActive: Date.now(),
      });
    }

    this.presenceInfo.set(documentId, users);
    this.emit('presenceChanged', { documentId, users });
  }

  /**
   * Check if user is active
   * @param {string} documentId Document ID
   * @param {string} userId User ID
   * @returns {boolean} Whether user is active
   * @private
   */
  _isUserActive(documentId, userId) {
    const sessions = Array.from(this.activeSessions.values());
    return sessions.some(session => session.documentId === documentId && session.userId === userId);
  }

  /**
   * Stop collaboration service
   */
  stop() {
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.endSession(sessionId).catch(error => {
        LoggingService.trackError(error, {
          service: 'CollaborationService',
          method: 'stop',
          sessionId,
        });
      });
    }

    this.initialized = false;
  }
}

module.exports = new CollaborationService();
