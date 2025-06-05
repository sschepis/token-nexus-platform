/**
 * Example Cloud Functions using the new middleware system
 * Demonstrates various middleware patterns and usage
 */

const { 
  defineFunction, 
  defineValidatedFunction,
  defineRateLimitedFunction,
  stacks,
  schemas,
  compose,
  withValidation,
  withAuditLog,
  withPerformanceMonitoring
} = require('../middleware');

// Example 1: Simple authenticated function
defineFunction('getUserProfile', stacks.standard, async (request) => {
  const { user, organizationId } = request;
  
  // Function automatically has:
  // - Error handling
  // - Authentication check
  // - Organization context injection
  
  const userProfile = {
    id: user.id,
    email: user.get('email'),
    organizationId,
    lastLogin: user.get('lastLogin'),
    preferences: user.get('preferences') || {}
  };
  
  return {
    success: true,
    profile: userProfile
  };
});

// Example 2: Validated function with schema
defineValidatedFunction('updateUserProfile', {
  firstName: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  lastName: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  email: { type: 'email', required: true },
  preferences: { type: 'object' },
  timezone: { type: 'string', enum: ['UTC', 'EST', 'PST', 'CST', 'MST'] }
}, async (request) => {
  const { user, params } = request;
  
  // Parameters are automatically validated
  const { firstName, lastName, email, preferences, timezone } = params;
  
  // Update user profile
  user.set('firstName', firstName);
  user.set('lastName', lastName);
  user.set('email', email);
  user.set('preferences', preferences);
  user.set('timezone', timezone);
  user.set('updatedAt', new Date());
  
  await user.save(null, { useMasterKey: true });
  
  return {
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      firstName,
      lastName,
      email,
      timezone
    }
  };
});

// Example 3: Rate-limited function
defineRateLimitedFunction('sendPasswordReset', {
  maxRequests: 3,
  windowMs: 300000, // 5 minutes
  keyGenerator: (request) => request.params.email // Rate limit per email
}, async (request) => {
  const { params } = request;
  const { email } = params;
  
  // Find user by email
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('email', email);
  const user = await userQuery.first({ useMasterKey: true });
  
  if (!user) {
    // Don't reveal if email exists or not for security
    return {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    };
  }
  
  // Generate reset token
  const resetToken = Math.random().toString(36).substring(2, 15);
  const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
  
  user.set('passwordResetToken', resetToken);
  user.set('passwordResetExpiry', resetExpiry);
  await user.save(null, { useMasterKey: true });
  
  // Send email (implementation would go here)
  console.log(`Password reset token for ${email}: ${resetToken}`);
  
  return {
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  };
}, withValidation({
  email: { type: 'email', required: true }
}));

// Example 4: System admin only function
defineFunction('deleteUser', stacks.systemAdmin, async (request) => {
  const { params } = request;
  const { userId, reason } = params;
  
  if (!userId || !reason) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'userId and reason are required');
  }
  
  // Find user to delete
  const userQuery = new Parse.Query(Parse.User);
  const userToDelete = await userQuery.get(userId, { useMasterKey: true });
  
  if (!userToDelete) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, 'User not found');
  }
  
  // Log the deletion for audit purposes
  const AuditLog = Parse.Object.extend('AuditLog');
  const auditLog = new AuditLog();
  auditLog.set('eventType', 'admin_action');
  auditLog.set('description', `User deleted: ${userToDelete.get('email')}`);
  auditLog.set('userId', request.user.id);
  auditLog.set('severity', 'high');
  auditLog.set('metadata', {
    deletedUserId: userId,
    deletedUserEmail: userToDelete.get('email'),
    reason: reason
  });
  
  await auditLog.save(null, { useMasterKey: true });
  
  // Delete the user
  await userToDelete.destroy({ useMasterKey: true });
  
  return {
    success: true,
    message: `User ${userToDelete.get('email')} has been deleted`,
    deletedUser: {
      id: userId,
      email: userToDelete.get('email')
    }
  };
});

// Example 5: Organization admin function
defineFunction('inviteUserToOrganization', stacks.orgAdmin, async (request) => {
  const { params, organizationId } = request;
  const { email, role = 'member' } = params;
  
  if (!email) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, 'Email is required');
  }
  
  // Check if user already exists
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo('email', email);
  let invitedUser = await userQuery.first({ useMasterKey: true });
  
  if (invitedUser) {
    // User exists, add to organization
    const orgQuery = new Parse.Query('Organization');
    const organization = await orgQuery.get(organizationId, { useMasterKey: true });
    
    const users = organization.get('users') || [];
    if (!users.includes(invitedUser.id)) {
      users.push(invitedUser.id);
      organization.set('users', users);
      await organization.save(null, { useMasterKey: true });
    }
  } else {
    // Create invitation record
    const Invitation = Parse.Object.extend('Invitation');
    const invitation = new Invitation();
    invitation.set('email', email);
    invitation.set('organizationId', organizationId);
    invitation.set('role', role);
    invitation.set('invitedBy', request.user.id);
    invitation.set('status', 'pending');
    invitation.set('expiresAt', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days
    
    await invitation.save(null, { useMasterKey: true });
    
    // Send invitation email (implementation would go here)
    console.log(`Invitation sent to ${email} for organization ${organizationId}`);
  }
  
  return {
    success: true,
    message: `Invitation sent to ${email}`,
    userExists: !!invitedUser
  };
});

// Example 6: Custom middleware composition
const sensitiveOperationMiddleware = compose(
  require('../middleware/errorHandler').withErrorHandler,
  require('../middleware/errorHandler').withAuditLog({ 
    logParams: true, 
    logResult: false 
  }),
  require('../middleware/errorHandler').withPerformanceMonitoring({
    slowThreshold: 3000
  }),
  withValidation({
    action: { type: 'string', required: true, enum: ['approve', 'reject'] },
    reason: { type: 'string', required: true, minLength: 10 }
  }),
  require('../middleware/auth').withSystemAdmin
);

defineFunction('approveSensitiveOperation', sensitiveOperationMiddleware, async (request) => {
  const { params } = request;
  const { action, reason } = params;
  
  // Simulate sensitive operation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    action,
    reason,
    approvedBy: request.user.id,
    timestamp: new Date()
  };
});

// Example 7: Cached function for expensive operations
const expensiveOperationMiddleware = stacks.cached({
  ttl: 600000, // 10 minutes
  keyGenerator: (request) => `expensive_op:${request.organizationId}:${request.params.type}`
});

defineFunction('getExpensiveReport', expensiveOperationMiddleware, async (request) => {
  const { organizationId, params } = request;
  const { type = 'summary' } = params;
  
  console.log(`Generating expensive report for org ${organizationId}, type: ${type}`);
  
  // Simulate expensive operation
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const reportData = {
    organizationId,
    type,
    generatedAt: new Date(),
    data: {
      totalUsers: Math.floor(Math.random() * 1000),
      totalTransactions: Math.floor(Math.random() * 10000),
      revenue: Math.floor(Math.random() * 100000)
    }
  };
  
  return {
    success: true,
    report: reportData,
    cached: false // Will be true on subsequent calls within TTL
  };
});

// Example 8: Public function (no authentication required)
defineFunction('getSystemStatus', stacks.public, async (request) => {
  const status = {
    status: 'operational',
    timestamp: new Date(),
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  return {
    success: true,
    system: status
  };
});

console.log('[Examples] User management cloud functions defined with middleware');