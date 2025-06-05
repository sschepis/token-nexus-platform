import { WorkflowNode, WorkflowEdge, Workflow, WorkflowStatus } from '@/types/workflows';
import { Node, Edge } from 'reactflow';

export class WorkflowUtils {
  /**
   * Convert ReactFlow nodes to WorkflowNodes
   */
  static reactFlowNodesToWorkflowNodes(nodes: Node[]): WorkflowNode[] {
    return nodes.map(node => ({
      id: node.id,
      type: node.type || 'default',
      category: node.data.category,
      name: node.data.name || node.data.label,
      description: node.data.description,
      position: node.position,
      data: {
        label: node.data.label,
        config: node.data.config || {},
        serviceIntegration: node.data.serviceIntegration,
      },
      metadata: node.data.metadata,
    }));
  }

  /**
   * Convert WorkflowNodes to ReactFlow nodes
   */
  static workflowNodesToReactFlowNodes(nodes: WorkflowNode[]): Node[] {
    return nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        category: node.category,
        name: node.name,
        description: node.description,
        metadata: node.metadata,
      },
    }));
  }

  /**
   * Convert ReactFlow edges to WorkflowEdges
   */
  static reactFlowEdgesToWorkflowEdges(edges: Edge[]): WorkflowEdge[] {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      data: edge.data,
    }));
  }

  /**
   * Convert WorkflowEdges to ReactFlow edges
   */
  static workflowEdgesToReactFlowEdges(edges: WorkflowEdge[]): Edge[] {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type || 'default',
      data: edge.data,
    }));
  }

  /**
   * Validate workflow structure
   */
  static validateWorkflow(workflow: Partial<Workflow>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    if (workflow.nodes) {
      // Check for trigger nodes
      const triggerNodes = workflow.nodes.filter(node => node.category === 'trigger');
      if (triggerNodes.length === 0) {
        errors.push('Workflow must have at least one trigger node');
      }

      // Check for action nodes
      const actionNodes = workflow.nodes.filter(node => node.category === 'action');
      if (actionNodes.length === 0) {
        warnings.push('Workflow should have at least one action node');
      }

      // Check for orphaned nodes
      const connectedNodeIds = new Set<string>();
      if (workflow.edges) {
        workflow.edges.forEach(edge => {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
        });
      }

      const orphanedNodes = workflow.nodes.filter(node => 
        !connectedNodeIds.has(node.id) && workflow.nodes!.length > 1
      );
      
      if (orphanedNodes.length > 0) {
        warnings.push(`${orphanedNodes.length} node(s) are not connected to the workflow`);
      }

      // Check for cycles (basic check)
      if (workflow.edges && this.hasCycles(workflow.nodes, workflow.edges)) {
        warnings.push('Workflow contains cycles which may cause infinite loops');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if workflow has cycles
   */
  private static hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const graph = new Map<string, string[]>();
    
    // Build adjacency list
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      const neighbors = graph.get(edge.source) || [];
      neighbors.push(edge.target);
      graph.set(edge.source, neighbors);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get workflow execution order
   */
  static getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build graph and calculate in-degrees
    edges.forEach(edge => {
      const neighbors = graph.get(edge.source) || [];
      neighbors.push(edge.target);
      graph.set(edge.source, neighbors);
      
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no incoming edges
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = graph.get(current) || [];
      neighbors.forEach(neighbor => {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }

  /**
   * Calculate workflow statistics
   */
  static calculateWorkflowStats(workflow: Workflow): {
    nodeCount: number;
    edgeCount: number;
    triggerCount: number;
    actionCount: number;
    logicCount: number;
    integrationCount: number;
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const nodeCount = workflow.nodes.length;
    const edgeCount = workflow.edges.length;
    
    const triggerCount = workflow.nodes.filter(n => n.category === 'trigger').length;
    const actionCount = workflow.nodes.filter(n => n.category === 'action').length;
    const logicCount = workflow.nodes.filter(n => n.category === 'logic').length;
    const integrationCount = workflow.nodes.filter(n => n.category === 'integration').length;

    // Calculate complexity based on node count and structure
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (nodeCount > 10 || logicCount > 3) {
      complexity = 'complex';
    } else if (nodeCount > 5 || logicCount > 1) {
      complexity = 'moderate';
    }

    return {
      nodeCount,
      edgeCount,
      triggerCount,
      actionCount,
      logicCount,
      integrationCount,
      complexity,
    };
  }

  /**
   * Generate unique node ID
   */
  static generateNodeId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * Generate unique edge ID
   */
  static generateEdgeId(sourceId: string, targetId: string): string {
    return `edge-${sourceId}-${targetId}`;
  }

  /**
   * Clone workflow with new IDs
   */
  static cloneWorkflow(workflow: Workflow, newName: string): Partial<Workflow> {
    const idMapping = new Map<string, string>();
    
    // Generate new IDs for all nodes
    workflow.nodes.forEach(node => {
      idMapping.set(node.id, this.generateNodeId(node.type));
    });

    const clonedNodes: WorkflowNode[] = workflow.nodes.map(node => ({
      ...node,
      id: idMapping.get(node.id)!,
    }));

    const clonedEdges: WorkflowEdge[] = workflow.edges.map(edge => ({
      ...edge,
      id: this.generateEdgeId(idMapping.get(edge.source)!, idMapping.get(edge.target)!),
      source: idMapping.get(edge.source)!,
      target: idMapping.get(edge.target)!,
    }));

    return {
      name: newName,
      description: `Clone of ${workflow.description || workflow.name}`,
      nodes: clonedNodes,
      edges: clonedEdges,
      status: 'draft' as WorkflowStatus,
      tags: workflow.tags ? [...workflow.tags] : undefined,
      metadata: {
        ...workflow.metadata,
        templateId: workflow.id,
      },
    };
  }
}