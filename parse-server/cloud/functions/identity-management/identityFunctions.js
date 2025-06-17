/**
 * Identity Management Cloud Functions
 * Parse Cloud Functions for the Identity Management standard application
 */

// getUserCount function - the one causing the infinite loop
Parse.Cloud.define('getUserCount', async (request) => {
  // Optional: Add permission checks if only certain users should access this
  const { params } = request;
  const { organizationId } = params;

  try {
    const query = new Parse.Query(Parse.User);
    
    // Filter by organization if provided
    if (organizationId) {
      query.equalTo('organizationId', organizationId);
    }
    
    const count = await query.count({ useMasterKey: true });
    
    return {
      success: true,
      count: count
    };
  } catch (error) {
    console.error('Error in getUserCount:', error);
    throw new Error(`Failed to get user count: ${error.message}`);
  }
});

// Additional identity management functions can be added here
Parse.Cloud.define('createIdentity', async (request) => {
  const { user, params } = request;
  
  try {
    // Validate user permissions
    if (!user) {
      throw new Error('User must be authenticated');
    }
    
    // Validate required parameters
    const { 
      firstName, 
      lastName, 
      email, 
      organizationId
    } = params;
    
    if (!firstName || !lastName || !email) {
      throw new Error('firstName, lastName, and email are required');
    }
    
    // Create identity record
    const Identity = Parse.Object.extend('Identity');
    const identity = new Identity();
    
    identity.set('firstName', firstName);
    identity.set('lastName', lastName);
    identity.set('email', email);
    identity.set('organizationId', organizationId);
    identity.set('createdBy', user);
    
    const result = await identity.save(null, { useMasterKey: true });
    
    return {
      success: true,
      identity: {
        id: result.id,
        firstName: result.get('firstName'),
        lastName: result.get('lastName'),
        email: result.get('email'),
        organizationId: result.get('organizationId')
      }
    };
  } catch (error) {
    console.error('Error in createIdentity:', error);
    throw new Error(`Failed to create identity: ${error.message}`);
  }
});

console.log('✓ Identity management cloud functions loaded');