// src/controllers/types/controllerRegistryConfig.ts

import { ActionEventListener } from './actionEvents'; // Assuming actionEvents.ts will contain ActionEventListener

/**
 * Controller registry configuration
 */
export interface ControllerRegistryConfig {
  enableAuditLogging: boolean;
  enablePermissionChecking: boolean;
  enableApprovalWorkflows: boolean;
  defaultTimeout: number; // in milliseconds
  maxActionsPerPage: number;
  eventListeners: ActionEventListener[];
}