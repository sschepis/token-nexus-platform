import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  MoreHorizontal 
} from 'lucide-react';
import { NodeCategory } from '@/types/workflows';

export interface BaseNodeData {
  label: string;
  category: NodeCategory;
  name: string;
  description?: string;
  config: Record<string, any>;
  readOnly?: boolean;
  status?: 'idle' | 'running' | 'success' | 'error';
  error?: string;
  metadata?: {
    tags?: string[];
    version?: string;
    documentation?: string;
  };
  serviceIntegration?: {
    controllerId?: string;
    actionId?: string;
    triggerId?: string;
    integrationId?: string;
    cloudFunctionId?: string;
  };
}

export interface BaseNodeProps extends NodeProps {
  data: BaseNodeData;
}

const getCategoryColor = (category: NodeCategory) => {
  switch (category) {
    case 'trigger':
      return 'border-green-500 bg-green-50 text-green-700';
    case 'action':
      return 'border-blue-500 bg-blue-50 text-blue-700';
    case 'logic':
      return 'border-purple-500 bg-purple-50 text-purple-700';
    case 'integration':
      return 'border-orange-500 bg-orange-50 text-orange-700';
    default:
      return 'border-gray-500 bg-gray-50 text-gray-700';
  }
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'running':
      return <Clock className="h-3 w-3 text-blue-500 animate-spin" />;
    case 'success':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
};

export const BaseNode: React.FC<BaseNodeProps> = ({
  data,
  selected,
  id
}) => {
  const categoryColor = getCategoryColor(data.category);
  const statusIcon = getStatusIcon(data.status);

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Node selection is handled by ReactFlow
  };

  const handleConfigClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Open node configuration dialog
    console.log('Configure node:', id);
  };

  const handleExecuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Execute single node
    console.log('Execute node:', id);
  };

  return (
    <div className="relative">
      {/* Input handles */}
      {data.category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 border-2 border-gray-400 bg-white"
          style={{ left: -6 }}
        />
      )}

      {/* Node card */}
      <Card 
        className={`
          min-w-[200px] max-w-[300px] cursor-pointer transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}
          ${categoryColor}
        `}
        onClick={handleNodeClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {data.category}
              </Badge>
              {statusIcon}
            </div>
            
            {!data.readOnly && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleConfigClick}
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={handleExecuteClick}
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="text-sm font-medium truncate" title={data.label}>
            {data.label}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {data.description && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {data.description}
            </p>
          )}
          
          {data.error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {data.error}
            </div>
          )}

          {data.metadata?.tags && data.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {data.metadata.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {data.metadata.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{data.metadata.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output handles */}
      {data.category !== 'action' && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 border-2 border-gray-400 bg-white"
          style={{ right: -6 }}
        />
      )}

      {/* Conditional output handles for logic nodes */}
      {data.category === 'logic' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-3 h-3 border-2 border-green-400 bg-green-100"
            style={{ bottom: -6, left: '25%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-3 h-3 border-2 border-red-400 bg-red-100"
            style={{ bottom: -6, right: '25%' }}
          />
        </>
      )}
    </div>
  );
};

export default BaseNode;