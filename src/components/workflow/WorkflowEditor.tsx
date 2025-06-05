import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Node, Edge, addEdge, Connection, EdgeChange, NodeChange } from 'reactflow';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast as sonnerToast } from 'sonner';
import {
  Play,
  Save,
  Undo,
  Redo,
  Eye,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowSidebar } from './WorkflowSidebar';
import { WorkflowUtils } from './utils/WorkflowUtils';
import { nodeFactory } from './nodes/NodeFactory';
import { Workflow, WorkflowStatus, WorkflowNode, WorkflowEdge } from '@/types/workflows';
import {
  updateWorkflow,
  executeWorkflow,
  setWorkflowStatus,
} from '@/store/slices/workflowSlice';

interface WorkflowEditorProps {
  workflow?: Workflow;
  onSave?: (workflow: Partial<Workflow>) => Promise<void>;
  onExecute?: (workflowId: string) => Promise<void>;
  onStatusChange?: (workflowId: string, status: WorkflowStatus) => Promise<void>;
  readOnly?: boolean;
  className?: string;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow,
  onSave,
  onExecute,
  onStatusChange,
  readOnly = false,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.workflow);

  // Convert workflow nodes/edges to ReactFlow format
  const initialNodes: Node[] = useMemo(() => {
    return workflow ? WorkflowUtils.workflowNodesToReactFlowNodes(workflow.nodes) : [];
  }, [workflow?.nodes]);

  const initialEdges: Edge[] = useMemo(() => {
    return workflow ? WorkflowUtils.workflowEdgesToReactFlowEdges(workflow.edges) : [];
  }, [workflow?.edges]);

  // Local state
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update local state when workflow changes
  useEffect(() => {
    if (workflow) {
      setNodes(WorkflowUtils.workflowNodesToReactFlowNodes(workflow.nodes));
      setEdges(WorkflowUtils.workflowEdgesToReactFlowEdges(workflow.edges));
      setHasUnsavedChanges(false);
    }
  }, [workflow]);

  // Validate workflow whenever nodes or edges change
  useEffect(() => {
    if (workflow) {
      const workflowNodes = WorkflowUtils.reactFlowNodesToWorkflowNodes(nodes);
      const workflowEdges = WorkflowUtils.reactFlowEdgesToWorkflowEdges(edges);
      
      const validation = WorkflowUtils.validateWorkflow({
        ...workflow,
        nodes: workflowNodes,
        edges: workflowEdges,
      });

      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
    }
  }, [nodes, edges, workflow]);

  // Handle node changes
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    if (readOnly) return;
    
    setNodes((nds) => {
      const updatedNodes = nds.map(node => {
        const change = changes.find(c => 'id' in c && c.id === node.id);
        if (change) {
          switch (change.type) {
            case 'position':
              return { ...node, position: (change as any).position || node.position };
            case 'select':
              return { ...node, selected: (change as any).selected };
            case 'remove':
              return null;
            default:
              return node;
          }
        }
        return node;
      }).filter(Boolean) as Node[];
      
      setHasUnsavedChanges(true);
      return updatedNodes;
    });
  }, [readOnly]);

  // Handle edge changes
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readOnly) return;
    
    setEdges((eds) => {
      const updatedEdges = eds.map(edge => {
        const change = changes.find(c => 'id' in c && c.id === edge.id);
        if (change) {
          switch (change.type) {
            case 'select':
              return { ...edge, selected: (change as any).selected };
            case 'remove':
              return null;
            default:
              return edge;
          }
        }
        return edge;
      }).filter(Boolean) as Edge[];
      
      setHasUnsavedChanges(true);
      return updatedEdges;
    });
  }, [readOnly]);

  // Handle new connections
  const onConnect = useCallback((connection: Connection) => {
    if (readOnly) return;
    
    const newEdge: Edge = {
      id: WorkflowUtils.generateEdgeId(connection.source!, connection.target!),
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'default',
    };

    setEdges((eds) => addEdge(newEdge, eds));
    setHasUnsavedChanges(true);
  }, [readOnly]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Handle canvas click (deselect)
  const onCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Handle drag and drop from sidebar
  const onDrop = useCallback((event: React.DragEvent) => {
    if (readOnly) return;

    const nodeType = event.dataTransfer.getData('application/reactflow');
    if (!nodeType) return;

    // Position will be calculated in WorkflowCanvas
    const newNodeId = WorkflowUtils.generateNodeId(nodeType);
    const newNode = nodeFactory.createNode(nodeType, newNodeId, { x: 0, y: 0 });

    setNodes((nds) => [...nds, newNode]);
    setHasUnsavedChanges(true);
    setSelectedNodeId(newNodeId);
  }, [readOnly]);

  // Save workflow
  const handleSave = useCallback(async () => {
    if (!workflow || readOnly || isSaving) return;

    setIsSaving(true);
    try {
      const workflowNodes = WorkflowUtils.reactFlowNodesToWorkflowNodes(nodes);
      const workflowEdges = WorkflowUtils.reactFlowEdgesToWorkflowEdges(edges);

      const updatedWorkflow = {
        id: workflow.id,
        nodes: workflowNodes,
        edges: workflowEdges,
        updatedAt: new Date().toISOString(),
      };

      if (onSave) {
        await onSave(updatedWorkflow);
      } else {
        await dispatch(updateWorkflow(updatedWorkflow)).unwrap();
      }

      setHasUnsavedChanges(false);
      sonnerToast.success('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      sonnerToast.error(`Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  }, [workflow, nodes, edges, readOnly, isSaving, onSave, dispatch]);

  // Execute workflow
  const handleExecute = useCallback(async () => {
    if (!workflow || isExecuting || validationErrors.length > 0) return;

    setIsExecuting(true);
    try {
      if (onExecute) {
        await onExecute(workflow.id);
      } else {
        await dispatch(executeWorkflow({ workflowId: workflow.id })).unwrap();
      }

      sonnerToast.success('Workflow execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      sonnerToast.error(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  }, [workflow, isExecuting, validationErrors.length, onExecute, dispatch]);

  // Toggle workflow status
  const handleToggleStatus = useCallback(async () => {
    if (!workflow || readOnly) return;

    const newStatus: WorkflowStatus = workflow.status === 'active' ? 'paused' : 'active';
    
    try {
      if (onStatusChange) {
        await onStatusChange(workflow.id, newStatus);
      } else {
        dispatch(setWorkflowStatus({ id: workflow.id, status: newStatus }));
      }

      sonnerToast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (error) {
      console.error('Failed to update workflow status:', error);
      sonnerToast.error(`Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [workflow, readOnly, onStatusChange, dispatch]);

  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflow Selected</h3>
          <p className="text-gray-500">Select a workflow to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-gray-50 ${className}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <WorkflowSidebar
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNodeId}
          onNodeDragStart={(event, nodeType) => {
            // Handle drag start if needed
          }}
        />
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2">
                {getStatusIcon(workflow.status)}
                <h1 className="text-lg font-semibold">{workflow.name}</h1>
                <Badge variant="secondary">{workflow.status}</Badge>
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-orange-600">
                    Unsaved
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Validation Status */}
              {validationErrors.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {validationErrors.length} errors
                </Badge>
              )}
              {validationWarnings.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {validationWarnings.length} warnings
                </Badge>
              )}

              {!readOnly && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleStatus}
                    disabled={isLoading}
                  >
                    {workflow.status === 'active' ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleExecute}
                    disabled={isExecuting || validationErrors.length > 0 || workflow.status !== 'active'}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {isExecuting ? 'Executing...' : 'Execute'}
                  </Button>
                </>
              )}

              {readOnly && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Read Only
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {(validationErrors.length > 0 || validationWarnings.length > 0) && (
          <div className="bg-yellow-50 border-b px-4 py-2">
            {validationErrors.map((error, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ))}
            {validationWarnings.map((warning, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onCanvasClick={onCanvasClick}
            onDrop={onDrop}
            readOnly={readOnly}
            showMiniMap={true}
            showControls={true}
            showBackground={true}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;