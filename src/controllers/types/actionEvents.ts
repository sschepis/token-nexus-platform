/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Action execution event types
 */
export type ActionEventType = 
  | 'action_registered'
  | 'action_unregistered'
  | 'action_executed'
  | 'action_failed'
  | 'permission_denied'
  | 'approval_required'
  | 'approval_granted'
  | 'approval_denied';

/**
 * Action event data
 */
export interface ActionEvent {
  type: ActionEventType;
  actionId: string;
  pageId: string;
  userId: string;
  timestamp: Date;
  data?: unknown;
  error?: string;
}

/**
 * Action event listener
 */
export type ActionEventListener = (event: ActionEvent) => void;