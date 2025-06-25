/**
 * Organization utilities for Parse Cloud Functions
 */

/**
 * Validate that a user has access to an organization
 * @param {Parse.User} user - The user from the request
 * @param {string} organizationId - The organization ID to validate
 * @returns {Parse.Object} The organization object if access is valid
 * @throws {Error} If user doesn't have access to the organization
 */
async function validateOrganizationAccess(user, organizationId) {
  if (!user) {
    throw new Error('Authentication required');
  }

  if (!organizationId) {
    throw new Error('Organization ID required');
  }

  // System admins have access to all organizations
  const userRoles = user.get('roles') || [];
  if (userRoles.includes('system:admin')) {
    const orgQuery = new Parse.Query('Organization');
    const organization = await orgQuery.get(organizationId, { useMasterKey: true });
    return organization;
  }

  // Check if user is a member of the organization
  const orgQuery = new Parse.Query('Organization');
  orgQuery.equalTo('objectId', organizationId);
  orgQuery.equalTo('members.id', user.id);
  orgQuery.equalTo('members.status', 'Active');
  
  const organization = await orgQuery.first({ useMasterKey: true });
  
  if (!organization) {
    throw new Error('Access denied: User is not a member of this organization');
  }

  return organization;
}

/**
 * Get user's role in an organization
 * @param {Parse.User} user - The user
 * @param {string} organizationId - The organization ID
 * @returns {string|null} The user's role in the organization or null if not a member
 */
async function getUserOrganizationRole(user, organizationId) {
  if (!user || !organizationId) {
    return null;
  }

  // System admins are treated as super admins
  const userRoles = user.get('roles') || [];
  if (userRoles.includes('system:admin')) {
    return 'system:admin';
  }

  const orgQuery = new Parse.Query('Organization');
  orgQuery.equalTo('objectId', organizationId);
  orgQuery.equalTo('members.id', user.id);
  orgQuery.equalTo('members.status', 'Active');
  
  const organization = await orgQuery.first({ useMasterKey: true });
  
  if (!organization) {
    return null;
  }

  const members = organization.get('members') || [];
  const member = members.find(m => m.id === user.id);
  
  return member ? member.role : null;
}

/**
 * Check if user is an admin of an organization
 * @param {Parse.User} user - The user
 * @param {string} organizationId - The organization ID
 * @returns {boolean} True if user is an admin
 */
async function isOrganizationAdmin(user, organizationId) {
  const role = await getUserOrganizationRole(user, organizationId);
  return role === 'admin' || role === 'system:admin';
}

module.exports = {
  validateOrganizationAccess,
  getUserOrganizationRole,
  isOrganizationAdmin
};