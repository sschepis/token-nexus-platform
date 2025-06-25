import { BasePageController } from './base/BasePageController';
import { ActionContext } from './types/actionContexts';
import { ActionResult } from './types/actionResults';
import { safeParseCloudRun } from '@/utils/parseUtils';
import Parse from 'parse';

export class OrgLifecyclePageController extends BasePageController {
  constructor() {
    super({
      pageId: 'org-lifecycle',
      pageName: 'Organization Lifecycle Management',
      description: 'Comprehensive organization lifecycle management interface with parent and child organization controls',
      category: 'system-admin',
      tags: ['organizations', 'lifecycle', 'parent-org', 'child-org', 'system-admin'],
      permissions: ['system:admin', 'org_admin'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    this.registerViewParentOrgAction();
    this.registerInitializeParentOrgAction();
    this.registerViewChildOrgsAction();
    this.registerCreateChildOrgAction();
    this.registerUpdateOrgLifecycleAction();
    this.registerTransferOwnershipAction();
  }

  private registerViewParentOrgAction(): void {
    this.registerAction(
      {
        id: 'viewParentOrg',
        name: 'View Parent Organization',
        description: 'Retrieve and display the parent organization information',
        category: 'data',
        permissions: ['system:admin', 'org_admin'],
        parameters: []
      },
      async (params, context) => {
        try {
          const result = await safeParseCloudRun('getParentOrganization', {});
          
          if (result.success && result.parentOrg) {
            return {
              success: true,
              data: {
                id: result.parentOrg.objectId,
                name: result.parentOrg.name,
                contactEmail: result.parentOrg.contactEmail,
                isParentOrg: true,
                settings: result.parentOrg.settings
              }
            };
          }
          
          return {
            success: false,
            error: 'No parent organization found'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch parent organization'
          };
        }
      }
    );
  }

  private registerInitializeParentOrgAction(): void {
    this.registerAction(
      {
        id: 'initializeParentOrg',
        name: 'Initialize Parent Organization',
        description: 'Set up the parent organization that will manage all child organizations',
        category: 'data',
        permissions: ['system:admin'],
        parameters: [
          { name: 'name', type: 'string', description: 'Organization name', required: true },
          { name: 'contactEmail', type: 'string', description: 'Contact email address', required: true },
          { name: 'contactPhone', type: 'string', description: 'Contact phone number', required: false },
          { name: 'adminEmail', type: 'string', description: 'Admin email address', required: true },
          { name: 'adminFirstName', type: 'string', description: 'Admin first name', required: true },
          { name: 'adminLastName', type: 'string', description: 'Admin last name', required: true }
        ]
      },
      async (params, context) => {
        try {
          const result = await Parse.Cloud.run('initializeParentOrganization', params);
          
          if (result.success) {
            return {
              success: true,
              data: result,
              message: 'Parent organization initialized successfully'
            };
          }
          
          return {
            success: false,
            error: result.message || 'Failed to initialize parent organization'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initialize parent organization'
          };
        }
      }
    );
  }

  private registerViewChildOrgsAction(): void {
    this.registerAction(
      {
        id: 'viewChildOrgs',
        name: 'View Child Organizations',
        description: 'Retrieve and display all child organizations under the parent organization',
        category: 'data',
        permissions: ['system:admin', 'org_admin'],
        parameters: [
          { name: 'parentOrgId', type: 'string', description: 'Parent organization ID', required: true },
          { name: 'page', type: 'number', description: 'Page number for pagination', required: false },
          { name: 'limit', type: 'number', description: 'Number of items per page', required: false },
          { name: 'status', type: 'string', description: 'Filter by organization status', required: false },
          { name: 'searchQuery', type: 'string', description: 'Search query for organization names', required: false }
        ]
      },
      async (params, context) => {
        try {
          const queryParams: any = {
            parentOrgId: params.parentOrgId,
            page: params.page || 1,
            limit: params.limit || 20
          };

          if (params.status && params.status !== 'all') {
            queryParams.status = params.status;
          }

          if (params.searchQuery) {
            queryParams.searchQuery = params.searchQuery;
          }

          const result = await Parse.Cloud.run('getChildOrganizations', queryParams);

          if (result.success) {
            return {
              success: true,
              data: {
                children: result.children,
                totalPages: result.totalPages,
                currentPage: queryParams.page,
                totalCount: result.totalCount
              }
            };
          }

          return {
            success: false,
            error: 'Failed to fetch child organizations'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch child organizations'
          };
        }
      }
    );
  }

  private registerCreateChildOrgAction(): void {
    this.registerAction(
      {
        id: 'createChildOrg',
        name: 'Create Child Organization',
        description: 'Create a new child organization under the parent organization',
        category: 'data',
        permissions: ['system:admin', 'org_admin'],
        parameters: [
          { name: 'parentOrgId', type: 'string', description: 'Parent organization ID', required: true },
          { name: 'name', type: 'string', description: 'Organization name', required: true },
          { name: 'contactEmail', type: 'string', description: 'Contact email address', required: true },
          { name: 'contactPhone', type: 'string', description: 'Contact phone number', required: false },
          { name: 'planType', type: 'string', description: 'Plan type (starter, professional, enterprise)', required: true },
          { name: 'ownerEmail', type: 'string', description: 'Owner email address', required: true },
          { name: 'ownerFirstName', type: 'string', description: 'Owner first name', required: true },
          { name: 'ownerLastName', type: 'string', description: 'Owner last name', required: true },
          { name: 'industry', type: 'string', description: 'Industry type', required: false },
          { name: 'companySize', type: 'string', description: 'Company size', required: false }
        ]
      },
      async (params, context) => {
        try {
          const result = await Parse.Cloud.run('createChildOrganization', params);
          
          if (result.success) {
            return {
              success: true,
              data: result,
              message: 'Child organization created successfully'
            };
          }
          
          return {
            success: false,
            error: result.message || 'Failed to create child organization'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create child organization'
          };
        }
      }
    );
  }

  private registerUpdateOrgLifecycleAction(): void {
    this.registerAction(
      {
        id: 'updateOrgLifecycle',
        name: 'Update Organization Lifecycle',
        description: 'Update the lifecycle status of an organization (suspend, reactivate, archive)',
        category: 'data',
        permissions: ['system:admin', 'org_admin'],
        parameters: [
          { name: 'organizationId', type: 'string', description: 'Organization ID to update', required: true },
          { name: 'action', type: 'string', description: 'Lifecycle action (suspend, reactivate, archive)', required: true },
          { name: 'reason', type: 'string', description: 'Reason for the action', required: false }
        ]
      },
      async (params, context) => {
        try {
          const result = await Parse.Cloud.run('updateOrganizationLifecycle', params);
          
          if (result.success) {
            return {
              success: true,
              data: result,
              message: `Organization ${params.action} completed successfully`
            };
          }
          
          return {
            success: false,
            error: result.message || `Failed to ${params.action} organization`
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : `Failed to ${params.action} organization`
          };
        }
      }
    );
  }

  private registerTransferOwnershipAction(): void {
    this.registerAction(
      {
        id: 'transferOwnership',
        name: 'Transfer Organization Ownership',
        description: 'Transfer ownership of an organization to a new owner',
        category: 'data',
        permissions: ['system:admin', 'org_admin'],
        parameters: [
          { name: 'organizationId', type: 'string', description: 'Organization ID', required: true },
          { name: 'newOwnerEmail', type: 'string', description: 'New owner email address', required: true }
        ]
      },
      async (params, context) => {
        try {
          const result = await Parse.Cloud.run('transferOrganizationOwnership', params);
          
          if (result.success) {
            return {
              success: true,
              data: result,
              message: 'Organization ownership transferred successfully'
            };
          }
          
          return {
            success: false,
            error: result.message || 'Failed to transfer organization ownership'
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to transfer organization ownership'
          };
        }
      }
    );
  }
}

// Export singleton instance
export const orgLifecyclePageController = new OrgLifecyclePageController();