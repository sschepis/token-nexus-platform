import { ComponentType } from 'react';
import { NodeProps } from 'reactflow';
import { NodeCategory, WorkflowNodeType } from '@/types/workflows';
import { BaseNodeData } from './BaseNode';

// Node type registry
export interface NodeTypeDefinition {
  component: ComponentType<NodeProps>;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Record<string, any>;
  configSchema?: any; // JSON schema for validation
  inputs?: string[];
  outputs?: string[];
}

export class NodeFactory {
  private static nodeTypes = new Map<string, NodeTypeDefinition>();

  /**
   * Register a new node type
   */
  static registerNodeType(type: string, definition: NodeTypeDefinition) {
    this.nodeTypes.set(type, definition);
  }

  /**
   * Get all registered node types
   */
  static getAllNodeTypes(): Map<string, NodeTypeDefinition> {
    return new Map(this.nodeTypes);
  }

  /**
   * Get node types by category
   */
  static getNodeTypesByCategory(category: NodeCategory): Map<string, NodeTypeDefinition> {
    const filtered = new Map<string, NodeTypeDefinition>();
    
    this.nodeTypes.forEach((definition, type) => {
      if (definition.category === category) {
        filtered.set(type, definition);
      }
    });
    
    return filtered;
  }

  /**
   * Get a specific node type definition
   */
  static getNodeType(type: string): NodeTypeDefinition | undefined {
    return this.nodeTypes.get(type);
  }

  /**
   * Create a new node instance with default configuration
   */
  static createNode(
    type: string,
    id: string,
    position: { x: number; y: number },
    overrides?: Partial<BaseNodeData>
  ): any {
    const definition = this.getNodeType(type);
    
    if (!definition) {
      throw new Error(`Unknown node type: ${type}`);
    }

    return {
      id,
      type,
      position,
      data: {
        label: definition.name,
        category: definition.category,
        name: definition.name,
        description: definition.description,
        config: { ...definition.defaultConfig },
        ...overrides,
      },
    };
  }

  /**
   * Validate node configuration against schema
   */
  static validateNodeConfig(type: string, config: Record<string, any>): boolean {
    const definition = this.getNodeType(type);
    
    if (!definition || !definition.configSchema) {
      return true; // No schema means no validation
    }

    // TODO: Implement JSON schema validation
    // This would use a library like Ajv or Zod
    return true;
  }

  /**
   * Get available connection points for a node type
   */
  static getNodeConnections(type: string): { inputs: string[]; outputs: string[] } {
    const definition = this.getNodeType(type);
    
    if (!definition) {
      return { inputs: [], outputs: [] };
    }

    return {
      inputs: definition.inputs || ['input'],
      outputs: definition.outputs || ['output'],
    };
  }

  /**
   * Check if two node types can be connected
   */
  static canConnect(sourceType: string, targetType: string): boolean {
    const sourceDefinition = this.getNodeType(sourceType);
    const targetDefinition = this.getNodeType(targetType);

    if (!sourceDefinition || !targetDefinition) {
      return false;
    }

    // Basic rules:
    // - Triggers can only be source nodes
    // - Actions can only be target nodes
    // - Logic nodes can be both source and target
    // - Integration nodes can be both source and target

    if (sourceDefinition.category === 'action') {
      return false; // Actions cannot be source
    }

    if (targetDefinition.category === 'trigger') {
      return false; // Triggers cannot be target
    }

    return true;
  }

  /**
   * Get node type suggestions based on context
   */
  static getNodeSuggestions(
    context: {
      previousNodeType?: string;
      category?: NodeCategory;
      tags?: string[];
    }
  ): string[] {
    const suggestions: string[] = [];
    
    this.nodeTypes.forEach((definition, type) => {
      // Filter by category if specified
      if (context.category && definition.category !== context.category) {
        return;
      }

      // Add logic for smart suggestions based on previous node
      if (context.previousNodeType) {
        const canConnect = this.canConnect(context.previousNodeType, type);
        if (canConnect) {
          suggestions.push(type);
        }
      } else {
        suggestions.push(type);
      }
    });

    return suggestions;
  }

  /**
   * Convert WorkflowNodeType to NodeTypeDefinition
   */
  static fromWorkflowNodeType(nodeType: WorkflowNodeType): NodeTypeDefinition {
    return {
      component: null as any, // Will be set during registration
      category: nodeType.category,
      name: nodeType.name,
      description: nodeType.description,
      icon: nodeType.icon,
      color: nodeType.color,
      defaultConfig: {},
      inputs: nodeType.inputs?.map(input => input.id) || [],
      outputs: nodeType.outputs?.map(output => output.id) || [],
      configSchema: nodeType.configSchema,
    };
  }

  /**
   * Initialize default node types
   */
  static initializeDefaultNodeTypes() {
    // This will be called during app initialization
    // Default node types will be registered here
    console.log('NodeFactory: Default node types initialized');
  }
}

// Export singleton instance
export const nodeFactory = NodeFactory;