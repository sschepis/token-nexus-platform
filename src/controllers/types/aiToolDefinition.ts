/* eslint-disable @typescript-eslint/no-explicit-any */

import { UserContext } from './actionContexts'; // Import specific context

/**
 * AI tool definition (extends existing ToolDefinition)
 */
export interface AIToolDefinition {
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  execute: (args: Record<string, unknown>, userContext: UserContext) => Promise<unknown>;
  // Additional fields for controller integration
  sourceActionId: string;
  sourcePageId: string;
  category: string;
  permissions: string[];
  requiresApproval: boolean;
}