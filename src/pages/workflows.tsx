import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { controllerRegistry } from "@/controllers/ControllerRegistry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  RefreshCw,
  Workflow,
  Play,
  Copy,
  Edit,
  Trash2,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Archive,
  Eye,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast as sonnerToast } from "sonner";
import {
  fetchWorkflows,
  createWorkflow,
  setSelectedWorkflow,
  setWorkflowStatus,
  executeWorkflow,
  deleteWorkflow,
  cloneWorkflow,
} from "@/store/slices/workflowSlice";
import { 
  Workflow as WorkflowType, 
  CreateWorkflowRequest, 
  WorkflowStatus,
  CloneWorkflowRequest 
} from "@/types/workflows";
import { CreateWorkflowDialog } from "@/components/workflow/CreateWorkflowDialog";

/**
 * Workflows Page Component
 *
 * This page manages visual workflows for automation and orchestration.
 * Workflows can integrate with Parse triggers, cloud functions, notifications,
 * AI assistant, and external services.
 * 
 * Features:
 * - Create workflows from templates or scratch
 * - Visual workflow editor with drag-and-drop nodes
 * - Real-time execution monitoring and statistics
 * - Integration with existing platform services
 * - AI assistant integration for workflow optimization
 */
const WorkflowsPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { workflows, selectedWorkflowId, isLoading, error, templates, nodeTypes } = useAppSelector((state) => state.workflow);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Get the page controller for AI assistant integration
  const workflowPageController = controllerRegistry.getPageController('workflows');
  const isRegistered = !!workflowPageController;

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<WorkflowStatus | "all">("all");

  // Load workflows on component mount
  useEffect(() => {
    dispatch(fetchWorkflows({}));
  }, [dispatch]);

  // Filter workflows based on search, tab, category, and status
  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "active" && workflow.status === "active") || 
      (activeTab === "draft" && workflow.status === "draft") ||
      (activeTab === "paused" && workflow.status === "paused") ||
      (activeTab === "error" && workflow.status === "error") ||
      (activeTab === "archived" && workflow.status === "archived");

    const matchesSearch = 
      searchTerm === "" ||
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || workflow.metadata?.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || workflow.status === selectedStatus;

    return matchesTab && matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateWorkflow = async (workflowData: CreateWorkflowRequest) => {
    try {
      await dispatch(createWorkflow(workflowData)).unwrap();
      sonnerToast.success('Workflow created successfully');
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      sonnerToast.error(`Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleToggleStatus = async (workflowId: string, currentStatus: WorkflowStatus) => {
    const newStatus: WorkflowStatus = currentStatus === "active" ? "paused" : "active";
    
    try {
      dispatch(setWorkflowStatus({ id: workflowId, status: newStatus }));
      sonnerToast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'paused'}`);
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
      sonnerToast.error(`Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string, workflowName: string) => {
    try {
      await dispatch(executeWorkflow({ workflowId })).unwrap();
      sonnerToast.success(`Workflow "${workflowName}" execution started`);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      sonnerToast.error(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditWorkflow = (workflowId: string) => {
    dispatch(setSelectedWorkflow(workflowId));
    router.push(`/workflows/${workflowId}/edit`);
  };

  const handleViewWorkflow = (workflowId: string) => {
    dispatch(setSelectedWorkflow(workflowId));
    router.push(`/workflows/${workflowId}`);
  };

  const handleDeleteWorkflow = async (workflowId: string, workflowName: string) => {
    try {
      await dispatch(deleteWorkflow(workflowId)).unwrap();
      sonnerToast.success('Workflow deleted successfully');
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      sonnerToast.error(`Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloneWorkflow = async (sourceWorkflow: WorkflowType) => {
    const newName = prompt(`Enter a name for the cloned workflow:`, `${sourceWorkflow.name}_copy`);
    if (!newName) return;

    if (workflows.some(w => w.name === newName)) {
      sonnerToast.error('A workflow with that name already exists');
      return;
    }

    try {
      const cloneRequest: CloneWorkflowRequest = {
        sourceWorkflowId: sourceWorkflow.id,
        name: newName,
        description: `Clone of ${sourceWorkflow.description || sourceWorkflow.name}`
      };
      
      await dispatch(cloneWorkflow(cloneRequest)).unwrap();
      sonnerToast.success(`Workflow cloned successfully as "${newName}"`);
    } catch (error) {
      console.error('Failed to clone workflow:', error);
      sonnerToast.error(`Failed to clone workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshWorkflows = async () => {
    try {
      sonnerToast.info("Refreshing workflows...");
      await dispatch(fetchWorkflows({})).unwrap();
      sonnerToast.success("Workflows refreshed successfully");
    } catch (error) {
      console.error('Failed to refresh workflows:', error);
      sonnerToast.error(`Failed to refresh workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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

  // Get unique categories for filter
  const categories = Array.from(new Set(workflows.map(w => w.metadata?.category).filter(Boolean)));

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Visual Workflows</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage automated workflows that integrate with your platform services
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshWorkflows}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/workflows/statistics')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistics
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as WorkflowStatus | "all")}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                  <option value="error">Error</option>
                  <option value="archived">Archived</option>
                </select>

                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({workflows.length})</TabsTrigger>
                <TabsTrigger value="active">
                  Active ({workflows.filter(w => w.status === 'active').length})
                </TabsTrigger>
                <TabsTrigger value="draft">
                  Draft ({workflows.filter(w => w.status === 'draft').length})
                </TabsTrigger>
                <TabsTrigger value="paused">
                  Paused ({workflows.filter(w => w.status === 'paused').length})
                </TabsTrigger>
                <TabsTrigger value="error">
                  Error ({workflows.filter(w => w.status === 'error').length})
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived ({workflows.filter(w => w.status === 'archived').length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
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
                    ) : filteredWorkflows.length > 0 ? (
                      filteredWorkflows.map((workflow) => (
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
                                onCheckedChange={() => handleToggleStatus(workflow.id, workflow.status)}
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
                                <DropdownMenuItem onClick={() => handleViewWorkflow(workflow.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View workflow
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditWorkflow(workflow.id)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit workflow
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleExecuteWorkflow(workflow.id, workflow.name)}
                                  disabled={workflow.status !== 'active'}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Execute workflow
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCloneWorkflow(workflow)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clone workflow
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the workflow "${workflow.name}"?`)) {
                                      handleDeleteWorkflow(workflow.id, workflow.name);
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
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <CreateWorkflowDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateWorkflow={handleCreateWorkflow}
        templates={[]}
      />
    </>
  );
};

export default WorkflowsPage;