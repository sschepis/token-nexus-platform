/**
 * Authentication utilities for Parse Cloud Functions
 */

/**
 * Require user authentication
 * @param {Parse.User} user - The user from the request
 * @throws {Error} If user is not authenticated
 */
function requireAuth(user) {
  if (!user) {
    throw new Error('Authentication required');
  }
}

/**
 * Require organization admin permissions
 * @param {Parse.User} user - The user from the request
 * @param {string} organizationId - The organization ID to check
 * @throws {Error} If user is not an admin of the organization
 */
async function requireOrgAdmin(user, organizationId) {
  if (!user) {
    throw new Error('Authentication required');
  }

  if (!organizationId) {
    throw new Error('Organization ID required');
  }

  // Check if user is a system admin (has system:admin permission)
  const userRoles = user.get('roles') || [];
  if (userRoles.includes('system:admin')) {
    return; // System admins can access any organization
  }

  // Check if user is an admin of the specific organization
  const orgQuery = new Parse.Query('Organization');
  orgQuery.equalTo('objectId', organizationId);
  orgQuery.equalTo('members.id', user.id);
  orgQuery.equalTo('members.role', 'admin');
  
  const organization = await orgQuery.first({ useMasterKey: true });
  
  if (!organization) {
    throw new Error('Organization admin access required');
  }
}

/**
 * Check if user has permission to access an organization
 * @param {Parse.User} user - The user from the request
 * @param {string} organizationId - The organization ID to check
 * @returns {boolean} True if user has access
 */
async function hasOrganizationAccess(user, organizationId) {
  if (!user || !organizationId) {
    return false;
  }

  // System admins have access to all organizations
  const userRoles = user.get('roles') || [];
  if (userRoles.includes('system:admin')) {
    return true;
  }

  // Check if user is a member of the organization
  const orgQuery = new Parse.Query('Organization');
  orgQuery.equalTo('objectId', organizationId);
  orgQuery.equalTo('members.id', user.id);
  orgQuery.equalTo('members.status', 'Active');
  
  const organization = await orgQuery.first({ useMasterKey: true });
  return !!organization;
}

module.exports = {
  requireAuth,
  requireOrgAdmin,
  hasOrganizationAccess
};