import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpDown,
  MoreHorizontal,
  Workflow,
  Play,
  Copy,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Pause,
  Archive,
  Clock,
} from 'lucide-react';
import { Workflow as WorkflowType, WorkflowStatus } from '@/types/workflows';

interface WorkflowsTableProps {
  workflows: WorkflowType[];
  isLoading: boolean;
  searchTerm: string;
  selectedCategory: string;
  selectedStatus: WorkflowStatus | 'all';
  onToggleStatus: (workflowId: string, currentStatus: WorkflowStatus) => void;
  onExecuteWorkflow: (workflowId: string, workflowName: string) => void;
  onEditWorkflow: (workflowId: string) => void;
  onViewWorkflow: (workflowId: string) => void;
  onCloneWorkflow: (workflow: WorkflowType) => void;
  onDeleteWorkflow: (workflowId: string, workflowName: string) => void;
}

export const WorkflowsTable: React.FC<WorkflowsTableProps> = ({
  workflows,
  isLoading,
  searchTerm,
  selectedCategory,
  selectedStatus,
  onToggleStatus,
  onExecuteWorkflow,
  onEditWorkflow,
  onViewWorkflow,
  onCloneWorkflow,
  onDeleteWorkflow,
}) => {
  const getStatusIcon = (status: WorkflowStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: WorkflowStatus) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'error':
        return 'destructive';
      case 'paused':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'user-management':
        return 'text-blue-600 bg-blue-50';
      case 'data-processing':
        return 'text-green-600 bg-green-50';
      case 'notification':
        return 'text-purple-600 bg-purple-50';
      case 'integration':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">
              <div className="flex items-center">
                Workflow
                <ArrowUpDown className="ml-2 h-3 w-3" />
              </div>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Executions</TableHead>
            <TableHead>Last Run</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, index) => (
                <TableRow key={index}>
                  {Array(8)
                    .fill(0)
                    .map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                </TableRow>
              ))
          ) : workflows.length > 0 ? (
            workflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(workflow.status)}
                    <div>
                      <div className="font-medium">{workflow.name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {workflow.id.slice(0, 8)}... • v{workflow.version}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {workflow.metadata?.category && (
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${getCategoryColor(workflow.metadata.category)}`}>
                      <Workflow className="h-3 w-3" />
                      {workflow.metadata.category.replace('-', ' ')}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="max-w-[200px] truncate">
                    {workflow.description || 'No description'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.status === "active"}
                      onCheckedChange={() => onToggleStatus(workflow.id, workflow.status)}
                      disabled={workflow.status === "error"}
                    />
                    <Badge variant={getStatusBadgeVariant(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="font-medium">{workflow.metadata?.executionCount || 0}</div>
                    {workflow.metadata?.averageExecutionTime && (
                      <div className="text-muted-foreground text-xs">
                        ~{Math.round(workflow.metadata.averageExecutionTime / 1000)}s avg
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {workflow.metadata?.lastExecuted 
                      ? new Date(workflow.metadata.lastExecuted).toLocaleDateString()
                      : 'Never'
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onViewWorkflow(workflow.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditWorkflow(workflow.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onExecuteWorkflow(workflow.id, workflow.name)}
                        disabled={workflow.status !== 'active'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Execute workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCloneWorkflow(workflow)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Clone workflow
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete the workflow "${workflow.name}"?`)) {
                            onDeleteWorkflow(workflow.id, workflow.name);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete workflow
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                {searchTerm || selectedCategory !== "all" || selectedStatus !== "all" ? (
                  <div className="text-muted-foreground">
                    No workflows found matching the current filters
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    No workflows found. Create your first workflow to get started.
                  </div>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};