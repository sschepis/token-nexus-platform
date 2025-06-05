const auth = require('../auth');
const utils = require('../../utils');
const logger = utils.logger;

/**
 * Get organization profile with detailed information
 * This function returns organization details for users who have access to the organization
 */
Parse.Cloud.define("getOrganizationProfile", async (request) => {
  const { user } = request;
  const { orgId } = request.params;

  if (!user) {
    throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "User must be authenticated.");
  }

  if (!orgId) {
    throw new Parse.Error(Parse.Error.INVALID_QUERY, "Organization ID is required.");
  }

  try {
    // Check if user has access to this organization
    if (!user.get('isSystemAdmin') && !user.get('isAdmin')) {
      // Check if the organization is in the user's organizations relation
      const userOrgRelation = user.relation('organizations');
      const userOrgs = await userOrgRelation.query().find({ useMasterKey: true });
      const hasAccess = userOrgs.some(org => org.id === orgId);
      
      if (!hasAccess) {
        throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "Access denied to this organization.");
      }
    }

    // Get the organization with related data
    const Organization = Parse.Object.extend('Organization');
    const orgQuery = new Parse.Query(Organization);
    orgQuery.include('administrator');
    orgQuery.include('createdBy');
    orgQuery.include('updatedBy');
    
    const org = await orgQuery.get(orgId, { useMasterKey: true });

    if (!org) {
      throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Organization not found.");
    }

    // Get member count
    const OrgRole = Parse.Object.extend('OrgRole');
    const memberQuery = new Parse.Query(OrgRole);
    memberQuery.equalTo('organization', org);
    memberQuery.equalTo('isActive', true);
    const memberCount = await memberQuery.count({ useMasterKey: true });

    // Get administrator details
    const admin = org.get('administrator');
    const createdBy = org.get('createdBy');
    const updatedBy = org.get('updatedBy');

    // Build the organization profile response
    const organizationProfile = {
      id: org.id,
      objectId: org.id, // For compatibility
      name: org.get('name'),
      description: org.get('description'),
      subdomain: org.get('subdomain'),
      industry: org.get('industry'),
      logo: org.get('logo'),
      primaryColor: org.get('primaryColor'),
      secondaryColor: org.get('secondaryColor'),
      domain: org.get('domain'),
      status: org.get('status'),
      planType: org.get('planType'),
      plan: org.get('planType'), // Alias for compatibility
      memberCount: memberCount,
      administrator: admin ? {
        objectId: admin.id,
        className: 'User',
        __type: 'Pointer',
        id: admin.id,
        email: admin.get('email'),
        username: admin.get('username'),
        name: `${admin.get('firstName') || ''} ${admin.get('lastName') || ''}`.trim() || admin.get('email')
      } : null,
      createdAt: org.createdAt?.toISOString(),
      updatedAt: org.updatedAt?.toISOString(),
      createdBy: createdBy ? {
        objectId: createdBy.id,
        className: 'User',
        __type: 'Pointer',
        username: createdBy.get('username')
      } : null,
      updatedBy: updatedBy ? {
        objectId: updatedBy.id,
        className: 'User',
        __type: 'Pointer',
        username: updatedBy.get('username')
      } : null,
      settings: org.get('settings') || {},
      metadata: org.get('metadata') || {}
    };

    logger.info(`Retrieved organization profile for org ${orgId} by user ${user.id}`);

    return {
      success: true,
      organization: organizationProfile
    };

  } catch (error) {
    logger.error(`Error fetching organization profile for org ${orgId} by user ${user.id}:`, error);
    
    // Re-throw Parse errors as-is
    if (error instanceof Parse.Error) {
      throw error;
    }
    
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Failed to fetch organization profile.");
  }
});

module.exports = {
  // Cloud function is automatically registered
};