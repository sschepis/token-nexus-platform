// src/controllers/services/ActionValidationService.ts

import { ActionDefinition, ValidationRule } from '../types/actionDefinitions';
import { ValidationResult } from '../types/actionResults';

/**
 * Service for validating action definitions and their parameters.
 */
export class ActionValidationService {

  /**
   * Validate action definition
   */
  public validateAction(action: ActionDefinition): void {
    if (!action.id || !action.name || !action.description) {
      throw new Error('Action must have id, name, and description');
    }

    if (!action.execute || typeof action.execute !== 'function') {
      throw new Error('Action must have a valid execute function');
    }

    if (!['navigation', 'data', 'ui', 'external'].includes(action.category)) {
      throw new Error('Action category must be one of: navigation, data, ui, external');
    }
  }

  /**
   * Validate action parameters
   */
  public validateActionParameters(action: ActionDefinition, params: Record<string, unknown>): ValidationResult {
    const errors: Array<{ parameter: string; message: string; value: unknown }> = [];

    // Check required parameters
    action.parameters?.forEach(param => { // Added optional chaining for safety
      const value = params[param.name];

      if (param.required && (value === undefined || value === null)) {
        errors.push({
          parameter: param.name,
          message: `Required parameter '${param.name}' is missing`,
          value
        });
        return;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (!this.validateParameterType(value, param.type)) {
          errors.push({
            parameter: param.name,
            message: `Parameter '${param.name}' must be of type ${param.type}`,
            value
          });
        }

        // Custom validation rules
        if (param.validation) {
          param.validation.forEach(rule => {
            const ruleError = this.validateParameterRule(value, rule);
            if (ruleError) {
              errors.push({
                parameter: param.name,
                message: ruleError.message,
                value
              });
            }
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown types are considered valid
    }
  }

  /**
   * Validate parameter against a specific rule
   */
  private validateParameterRule(
    value: unknown,
    rule: ValidationRule
  ): { message: string } | null {
    switch (rule.type) {
      case 'format':
        if (typeof value === 'string' && rule.pattern && !new RegExp(rule.pattern).test(value)) {
          return { message: rule.message || `Invalid format for '${value}'` };
        }
        break;
      case 'enum':
        if (rule.values && !rule.values.includes(value as string | number)) {
          return { message: rule.message || `Value '${value}' not in allowed enum list` };
        }
        break;
      case 'range':
        if (typeof value === 'number') {
          if ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max)) {
            return { message: rule.message || `Value '${value}' out of range [${rule.min || '-∞'}, ${rule.max || '+∞'}]` };
          }
        }
        break;
      case 'custom':
        if (rule.customValidator && !rule.customValidator(value)) {
          return { message: rule.message || `Custom validation failed for '${value}'` };
        }
        break;
      default:
        break;
    }
    return null;
  }
}

export const actionValidationService = new ActionValidationService();