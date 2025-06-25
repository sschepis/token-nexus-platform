import { WorkflowBaseController } from './workflows/WorkflowBaseController';

// Import all workflow action modules
import {
  fetchWorkflowsAction,
  createWorkflowAction,
  updateWorkflowAction,
  deleteWorkflowAction,
  cloneWorkflowAction
} from './workflows/actions/WorkflowManagementActions';

import {
  executeWorkflowAction,
  updateWorkflowStatusAction,
  getWorkflowExecutionsAction,
  validateWorkflowAction
} from './workflows/actions/WorkflowExecutionActions';

import {
  getNodeTypesAction,
  getWorkflowStatisticsAction,
  getWorkflowTemplatesAction,
  exportWorkflowAction,
  importWorkflowAction
} from './workflows/actions/WorkflowConfigurationActions';

/**
 * Workflow Page Controller
 * Secure controller using BasePageController pattern with modular actions
 * Replaces direct Parse SDK usage with secure callCloudFunction calls
 */
export class WorkflowPageController extends WorkflowBaseController {
  constructor() {
    super({
      pageId: 'workflows',
      pageName: 'Workflow Management',
      description: 'Visual workflow automation and orchestration system',
      category: 'automation',
      tags: ['workflow', 'automation', 'visual', 'integration', 'orchestration'],
      permissions: [
        'workflows:read',
        'workflows:write', 
        'workflows:execute',
        'workflows:manage'
      ],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    // Core workflow management actions
    this.registerAction(fetchWorkflowsAction.config, fetchWorkflowsAction.executor);
    this.registerAction(createWorkflowAction.config, createWorkflowAction.executor);
    this.registerAction(updateWorkflowAction.config, updateWorkflowAction.executor);
    this.registerAction(deleteWorkflowAction.config, deleteWorkflowAction.executor);
    this.registerAction(cloneWorkflowAction.config, cloneWorkflowAction.executor);

    // Workflow execution and monitoring actions
    this.registerAction(executeWorkflowAction.config, executeWorkflowAction.executor);
    this.registerAction(updateWorkflowStatusAction.config, updateWorkflowStatusAction.executor);
    this.registerAction(getWorkflowExecutionsAction.config, getWorkflowExecutionsAction.executor);
    this.registerAction(validateWorkflowAction.config, validateWorkflowAction.executor);

    // Workflow configuration and utility actions
    this.registerAction(getNodeTypesAction.config, getNodeTypesAction.executor);
    this.registerAction(getWorkflowStatisticsAction.config, getWorkflowStatisticsAction.executor);
    this.registerAction(getWorkflowTemplatesAction.config, getWorkflowTemplatesAction.executor);
    this.registerAction(exportWorkflowAction.config, exportWorkflowAction.executor);
    this.registerAction(importWorkflowAction.config, importWorkflowAction.executor);
  }
}

// Export singleton instance following platform pattern
export const workflowPageController = new WorkflowPageController();