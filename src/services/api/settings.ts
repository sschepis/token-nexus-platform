import { callCloudFunction, callCloudFunctionForArray } from '../../utils/apiUtils';

/**
 * Settings API for organization and user settings management
 * This provides secure API calls for all settings-related operations
 */

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  lastActive?: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  logo?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: Record<string, any>;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUserData {
  email: string;
  role: string;
  message?: string;
}

export interface UpdateMemberRoleData {
  userId: string;
  role: string;
}

export const settingsApi = {
  /**
   * Get organization members
   */
  async getOrganizationMembers(organizationId: string) {
    return callCloudFunctionForArray('getOrganizationMembers', { organizationId }, {
      errorMessage: 'Failed to fetch organization members'
    });
  },

  /**
   * Invite user to organization
   */
  async inviteUserToOrganization(organizationId: string, inviteData: InviteUserData) {
    return callCloudFunction('inviteUserToOrganization', { 
      organizationId, 
      ...inviteData 
    }, {
      errorMessage: 'Failed to invite user to organization'
    });
  },

  /**
   * Update organization member role
   */
  async updateOrganizationMemberRole(organizationId: string, updateData: UpdateMemberRoleData) {
    return callCloudFunction('updateOrganizationMemberRole', { 
      organizationId, 
      ...updateData 
    }, {
      errorMessage: 'Failed to update member role'
    });
  },

  /**
   * Remove organization member
   */
  async removeOrganizationMember(organizationId: string, userId: string) {
    return callCloudFunction('removeOrganizationMember', { 
      organizationId, 
      userId 
    }, {
      errorMessage: 'Failed to remove organization member'
    });
  },

  /**
   * Get organization profile
   */
  async getOrganizationProfile(organizationId: string) {
    return callCloudFunction('getOrganizationProfile', { organizationId }, {
      errorMessage: 'Failed to fetch organization profile'
    });
  },

  /**
   * Update organization profile
   */
  async updateOrganizationProfile(organizationId: string, profileData: Partial<OrganizationProfile>) {
    return callCloudFunction('updateOrganizationProfile', { 
      organizationId, 
      ...profileData 
    }, {
      errorMessage: 'Failed to update organization profile'
    });
  }
};

// Export individual functions for backward compatibility
export const {
  getOrganizationMembers,
  inviteUserToOrganization,
  updateOrganizationMemberRole,
  removeOrganizationMember,
  getOrganizationProfile,
  updateOrganizationProfile
} = settingsApi;

// Default export
export default settingsApi;