/* eslint-disable @typescript-eslint/no-explicit-any */

import { ActionResult } from './actionResults'; // Assuming actionResults.ts will contain ActionResult
import { ActionContext } from './actionContexts'; // Assuming actionContexts.ts will contain ActionContext

/**
 * Validation rule for action parameters
 */
export interface ValidationRule {
  type: 'required' | 'format' | 'enum' | 'range' | 'custom';
  pattern?: string;
  values?: (string | number)[];
  min?: number;
  max?: number;
  customValidator?: (value: unknown) => boolean | string;
  message?: string;
}

/**
 * Parameter definition for actions
 */
export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  validation?: ValidationRule[];
  defaultValue?: unknown;
  examples?: unknown[];
}

/**
 * Example usage of an action
 */
export interface ActionExample {
  params: Record<string, unknown>;
  description: string;
  expectedResult?: unknown;
}

/**
 * Action executor function type
 */
export type ActionExecutor = (
  params: Record<string, unknown>,
  context: ActionContext
) => Promise<ActionResult>;

/**
 * Action definition
 */
export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'data' | 'ui' | 'external';
  permissions: string[];
  parameters: ActionParameter[];
  execute: ActionExecutor;
  metadata?: {
    tags: string[];
    examples: ActionExample[];
    relatedActions: string[];
    version?: string;
    deprecated?: boolean;
    deprecationMessage?: string;
  };
}