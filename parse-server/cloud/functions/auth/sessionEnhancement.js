/* global Parse */

// Define SessionInfo class
const SessionInfo = Parse.Object.extend('SessionInfo');

/**
 * Enhance session with device and location info
 */
Parse.Cloud.afterSave(Parse.Session, async request => {
  const session = request.object;
  const user = session.get('user');

  if (!user) return;

  try {
    // Get or create session info
    const query = new Parse.Query(SessionInfo);

    query.equalTo('sessionToken', session.getSessionToken());
    let sessionInfo = await query.first({ useMasterKey: true });

    if (!sessionInfo) {
      sessionInfo = new SessionInfo();
    }

    // Extract device info from request headers
    const userAgent = request.headers['user-agent'];
    const deviceInfo = parseUserAgent(userAgent);

    // Get IP and approximate location
    const ip = request.ip;
    const location = await getLocationFromIP(ip);

    // Check concurrent sessions
    await enforceConcurrentSessionLimit(user, session);

    // Update session info
    sessionInfo.set({
      user,
      sessionToken: session.getSessionToken(),
      deviceInfo,
      ipAddress: ip,
      location,
      lastActivity: new Date(),
      status: 'active',
      userAgent,
      deviceId: deviceInfo.deviceId,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      isMobile: deviceInfo.isMobile,
    });

    // Set ACL
    const acl = new Parse.ACL();

    acl.setReadAccess(user, true);
    acl.setWriteAccess(user, false);
    acl.setRoleReadAccess('admin', true);
    acl.setRoleWriteAccess('admin', true);
    sessionInfo.setACL(acl);

    await sessionInfo.save(null, { useMasterKey: true });

    // Check for suspicious activity
    await checkForSuspiciousActivity(sessionInfo);
  } catch (error) {
    console.error('Error in session enhancement:', error);
  }
});

/**
 * Update session activity timestamp
 */
Parse.Cloud.beforeFind(Parse.Session, async request => {
  if (!request.user) return;

  try {
    const query = new Parse.Query(SessionInfo);

    query.equalTo('sessionToken', request.user.getSessionToken());
    const sessionInfo = await query.first({ useMasterKey: true });

    if (sessionInfo) {
      sessionInfo.set('lastActivity', new Date());
      await sessionInfo.save(null, { useMasterKey: true });
    }
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
});

/**
 * Get user's active sessions with enhanced info
 */
Parse.Cloud.define('getEnhancedSessions', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const query = new Parse.Query(SessionInfo);

  query.equalTo('user', request.user);
  query.equalTo('status', 'active');
  query.descending('lastActivity');

  const sessions = await query.find({ useMasterKey: true });

  return sessions.map(session => ({
    id: session.id,
    deviceInfo: session.get('deviceInfo'),
    location: session.get('location'),
    lastActivity: session.get('lastActivity'),
    browser: session.get('browser'),
    os: session.get('os'),
    isMobile: session.get('isMobile'),
    ipAddress: session.get('ipAddress'),
  }));
});

/**
 * Terminate specific sessions with enhanced cleanup
 */
Parse.Cloud.define('terminateEnhancedSessions', async request => {
  if (!request.user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
  }

  const { sessionIds } = request.params;

  if (!sessionIds || !Array.isArray(sessionIds)) {
    throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Session IDs array required');
  }

  const query = new Parse.Query(SessionInfo);

  query.containedIn('objectId', sessionIds);
  query.equalTo('user', request.user);

  const sessions = await query.find({ useMasterKey: true });

  // Update status and cleanup
  const updates = sessions.map(async session => {
    session.set('status', 'terminated');
    session.set('terminatedAt', new Date());
    session.set('terminatedBy', request.user.id);

    // Create termination audit log
    const SecurityEvent = Parse.Object.extend('SecurityEvent');
    const event = new SecurityEvent();

    event.set({
      type: 'session_termination',
      userId: request.user.id,
      sessionId: session.id,
      deviceInfo: session.get('deviceInfo'),
      location: session.get('location'),
      ipAddress: session.get('ipAddress'),
      eventDate: new Date(),
    });

    await Promise.all([
      session.save(null, { useMasterKey: true }),
      event.save(null, { useMasterKey: true }),
    ]);
  });

  await Promise.all(updates);

  return { success: true, terminated: sessions.length };
});

// Helper functions

async function enforceConcurrentSessionLimit(user, _currentSession) {
  const maxConcurrentSessions = 5; // Could be configurable per user/role

  const query = new Parse.Query(SessionInfo);

  query.equalTo('user', user);
  query.equalTo('status', 'active');
  query.descending('lastActivity');

  const sessions = await query.find({ useMasterKey: true });

  if (sessions.length >= maxConcurrentSessions) {
    // Keep most recent sessions, terminate oldest
    const sessionsToTerminate = sessions.slice(maxConcurrentSessions - 1);

    const updates = sessionsToTerminate.map(session => {
      session.set('status', 'terminated');
      session.set('terminatedAt', new Date());
      session.set('terminationReason', 'concurrent_limit');

      return session.save(null, { useMasterKey: true });
    });

    await Promise.all(updates);
  }
}

async function checkForSuspiciousActivity(sessionInfo) {
  const user = sessionInfo.get('user');
  const location = sessionInfo.get('location');
  const deviceId = sessionInfo.get('deviceId');

  // Get user's recent sessions
  const query = new Parse.Query(SessionInfo);

  query.equalTo('user', user);
  query.equalTo('status', 'active');
  query.notEqualTo('objectId', sessionInfo.id);
  query.descending('lastActivity');
  query.limit(5);

  const recentSessions = await query.find({ useMasterKey: true });

  // Check for suspicious patterns
  const suspicious = recentSessions.some(session => {
    // Different location but too close in time
    if (session.get('location') && location) {
      const distance = calculateDistance(
        session.get('location').latitude,
        session.get('location').longitude,
        location.latitude,
        location.longitude
      );
      const timeDiff = Math.abs(session.get('lastActivity') - new Date()) / 1000 / 60; // minutes

      if (distance > 500 && timeDiff < 60) {
        // 500km and 60 minutes
        return true;
      }
    }

    // Different device but same IP
    if (
      session.get('deviceId') !== deviceId &&
      session.get('ipAddress') === sessionInfo.get('ipAddress')
    ) {
      return true;
    }

    return false;
  });

  if (suspicious) {
    // Create security alert
    const SecurityEvent = Parse.Object.extend('SecurityEvent');
    const event = new SecurityEvent();

    event.set({
      type: 'suspicious_session',
      userId: user.id,
      sessionId: sessionInfo.id,
      deviceInfo: sessionInfo.get('deviceInfo'),
      location: location,
      ipAddress: sessionInfo.get('ipAddress'),
      eventDate: new Date(),
      severity: 'high',
    });

    await event.save(null, { useMasterKey: true });
  }
}

function parseUserAgent(userAgent) {
  // Basic UA parsing - could be enhanced with a proper UA parsing library
  const deviceId = generateDeviceId(userAgent);
  const isMobile = /mobile/i.test(userAgent);
  const browser = extractBrowser(userAgent);
  const os = extractOS(userAgent);

  return {
    deviceId,
    raw: userAgent,
    browser,
    os,
    isMobile,
  };
}

function generateDeviceId(userAgent) {
  // Create a consistent device ID from UA properties
  const hash = require('crypto').createHash('sha256');

  return hash.update(userAgent).digest('hex');
}

function extractBrowser(userAgent) {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';

  return 'Unknown';
}

function extractOS(userAgent) {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';

  return 'Unknown';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function getLocationFromIP(_ip) {
  // This would typically use a geolocation service
  // For now, return null to avoid external dependencies
  return null;
}

// Export cloud functions directly
// No need to export since they're registered with Parse.Cloud.define
