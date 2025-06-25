import { BasePageController } from '../base/BasePageController';

/**
 * Base controller for workflow-related pages
 * Extends BasePageController with workflow-specific configuration
 */
export abstract class WorkflowBaseController extends BasePageController {
  constructor(config: {
    pageId: string;
    pageName: string;
    description: string;
    category?: string;
    tags?: string[];
    permissions?: string[];
    version?: string;
  }) {
    super({
      ...config,
      category: config.category || 'automation',
      tags: [...(config.tags || []), 'workflow', 'automation'],
      permissions: [
        ...(config.permissions || []),
        'workflows:read'
      ],
      version: config.version || '1.0.0'
    });
  }

  /**
   * Get workflow-specific context for actions
   */
  protected getWorkflowContext(context: any): any {
    return {
      ...context,
      workflowFeatures: {
        visualEditor: true,
        templates: true,
        nodeTypes: true,
        executions: true,
        statistics: true
      }
    };
  }

  /**
   * Validate workflow permissions
   */
  protected validateWorkflowPermissions(action: string, context: any): boolean {
    const requiredPermissions = {
      read: ['workflows:read'],
      write: ['workflows:write'],
      execute: ['workflows:execute'],
      manage: ['workflows:manage']
    };

    const actionType = this.getActionType(action);
    const required = requiredPermissions[actionType] || ['workflows:read'];
    
    return required.every(permission => 
      context.user?.permissions?.includes(permission) ||
      context.user?.isAdmin ||
      context.user?.isSystemAdmin
    );
  }

  /**
   * Determine action type based on action name
   */
  private getActionType(action: string): string {
    if (action.includes('create') || action.includes('update') || action.includes('clone') || action.includes('import')) {
      return 'write';
    }
    if (action.includes('execute') || action.includes('run')) {
      return 'execute';
    }
    if (action.includes('delete') || action.includes('manage')) {
      return 'manage';
    }
    return 'read';
  }
}