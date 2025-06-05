import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeChange,
  NodeChange,
  ReactFlowProvider,
  ReactFlowInstance,
  useReactFlow,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Grid, 
  Eye,
  Download,
  Upload,
  RotateCcw,
  Save
} from 'lucide-react';

// Import custom node types
import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { LogicNode } from './nodes/LogicNode';
import { IntegrationNode } from './nodes/IntegrationNode';

// Node type mapping for ReactFlow
const nodeTypes = {
  'trigger': TriggerNode,
  'action': ActionNode,
  'logic': LogicNode,
  'integration': IntegrationNode,
  'parse-trigger': TriggerNode,
  'webhook-trigger': TriggerNode,
  'schedule-trigger': TriggerNode,
  'email-action': ActionNode,
  'api-action': ActionNode,
  'notification-action': ActionNode,
  'ai-action': ActionNode,
  'workflow-action': ActionNode,
  'condition-logic': LogicNode,
  'loop-logic': LogicNode,
  'transform-logic': LogicNode,
  'delay-logic': LogicNode,
  'parallel-logic': LogicNode,
};

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onNodeDoubleClick?: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onCanvasClick?: (event: React.MouseEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  readOnly?: boolean;
  showMiniMap?: boolean;
  showControls?: boolean;
  showBackground?: boolean;
  className?: string;
}

const WorkflowCanvasContent: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onCanvasClick,
  onDrop,
  onDragOver,
  readOnly = false,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  className = '',
}) => {
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Handle connection validation
  const isValidConnection = useCallback((connection: Connection) => {
    // Basic validation rules
    if (!connection.source || !connection.target) {
      return false;
    }

    // Prevent self-connections
    if (connection.source === connection.target) {
      return false;
    }

    // Find source and target nodes
    const sourceNode = nodes.find(node => node.id === connection.source);
    const targetNode = nodes.find(node => node.id === connection.target);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // Prevent connecting action nodes as source (they should be endpoints)
    if (sourceNode.data.category === 'action') {
      return false;
    }

    // Prevent connecting trigger nodes as target (they should be starting points)
    if (targetNode.data.category === 'trigger') {
      return false;
    }

    // Check for existing connection
    const existingEdge = edges.find(edge => 
      edge.source === connection.source && edge.target === connection.target
    );
    
    if (existingEdge) {
      return false;
    }

    return true;
  }, [nodes, edges]);

  // Handle connection creation
  const handleConnect = useCallback((params: Connection) => {
    if (readOnly || !isValidConnection(params)) {
      return;
    }
    onConnect(params);
  }, [readOnly, isValidConnection, onConnect]);

  // Handle canvas click
  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    onCanvasClick?.(event);
  }, [onCanvasClick]);

  // Handle drop events for drag and drop from sidebar
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    if (readOnly) {
      return;
    }

    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!reactFlowBounds) {
      return;
    }

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // Create drop event with position
    const dropEvent = {
      ...event,
      position,
    };

    onDrop?.(dropEvent as any);
  }, [readOnly, reactFlowInstance, onDrop]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOver?.(event);
  }, [onDragOver]);

  // Fit view on mount
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1 });
      }, 100);
    }
  }, [nodes.length, reactFlowInstance]);

  // Canvas controls
  const handleZoomIn = () => reactFlowInstance.zoomIn();
  const handleZoomOut = () => reactFlowInstance.zoomOut();
  const handleFitView = () => reactFlowInstance.fitView({ padding: 0.1 });
  const handleResetView = () => {
    reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
  };

  return (
    <div 
      ref={reactFlowWrapper}
      className={`relative w-full h-full ${className}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={handlePaneClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        isValidConnection={isValidConnection}
        deleteKeyCode={readOnly ? null : 'Delete'}
        multiSelectionKeyCode={readOnly ? null : 'Shift'}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectNodesOnDrag={!readOnly}
        snapToGrid={true}
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        {/* Background */}
        {showBackground && (
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="#e2e8f0"
          />
        )}

        {/* Controls */}
        {showControls && (
          <Controls 
            position="bottom-right"
            showZoom={true}
            showFitView={true}
            showInteractive={!readOnly}
          />
        )}

        {/* MiniMap */}
        {showMiniMap && (
          <MiniMap 
            position="bottom-left"
            zoomable
            pannable
            nodeColor={(node) => {
              switch (node.data.category) {
                case 'trigger':
                  return '#10b981';
                case 'action':
                  return '#3b82f6';
                case 'logic':
                  return '#8b5cf6';
                case 'integration':
                  return '#f59e0b';
                default:
                  return '#6b7280';
              }
            }}
            nodeStrokeWidth={3}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        )}

        {/* Custom Controls Panel */}
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 bg-white rounded-lg shadow-lg p-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFitView}
              className="h-8 w-8 p-0"
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetView}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </Panel>

        {/* Workflow Stats Panel */}
        <Panel position="top-left" className="flex flex-col gap-2">
          <div className="bg-white rounded-lg shadow-lg p-3">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {nodes.length} nodes
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {edges.length} connections
                </Badge>
              </div>
              
              {readOnly && (
                <Badge variant="outline" className="text-xs text-gray-600">
                  <Eye className="h-3 w-3 mr-1" />
                  Read Only
                </Badge>
              )}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasContent {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;