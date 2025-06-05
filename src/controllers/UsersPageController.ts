// src/controllers/UsersPageController.ts

import {
  ActionDefinition,
  PageController,
  PageContext
} from './types/ActionTypes';
import { UserViewActions } from './users/UserViewActions';
import { UserManagementActions } from './users/UserManagementActions';
import { UserBulkActions } from './users/UserBulkActions';

/**
 * Users Page Controller
 * Manages all user-related actions for the Users page and AI assistant integration
 */
export class UsersPageController {
  private pageId = 'users';
  private pageName = 'User Management';
  private description = 'Comprehensive user management interface with AI assistant integration';

  private userViewActions = new UserViewActions();
  private userManagementActions = new UserManagementActions();
  private userBulkActions = new UserBulkActions();

  /**
   * Get the page controller configuration
   */
  getPageController(): PageController {
    const pageContext: PageContext = {
      pageId: this.pageId,
      pageName: this.pageName,
      state: {
        users: [],
        filters: {},
        pagination: { page: 1, pageSize: 50 },
        selectedUsers: []
      },
      props: {},
      metadata: {
        category: 'user-management',
        tags: ['users', 'organization', 'permissions', 'roles'],
        permissions: ['org_admin', 'user_manager']
      }
    };

    const actions = new Map<string, ActionDefinition>();

    // Register actions from different modules
    this.userViewActions.registerActions(actions);
    this.userManagementActions.registerActions(actions);
    this.userBulkActions.registerActions(actions);

    return {
      pageId: this.pageId,
      pageName: this.pageName,
      description: this.description,
      context: pageContext,
      actions,
      metadata: {
        category: 'user-management',
        tags: ['users', 'organization', 'permissions', 'roles'],
        permissions: ['org_admin', 'user_manager'],
        version: '1.0.0'
      },
      isActive: true,
      registeredAt: new Date()
    };
  }
}

// Export singleton instance
export const usersPageController = new UsersPageController();