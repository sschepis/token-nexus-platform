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
  Code,
  Play,
  Copy,
  Download,
  Edit,
  Trash2,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
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
  addFunction,
  updateFunction,
  deleteFunction,
  setSelectedFunction,
} from "@/store/slices/cloudFunctionSlice";
import { CloudFunction, CreateFunctionRequest, ExecuteFunctionRequest, ExecuteFunctionResponse } from "@/types/cloud-functions";
import CreateFunctionDialog from "@/components/cloud-functions/CreateFunctionDialog";
import FunctionDetail from "@/components/cloud-functions/FunctionDetail";
import ExecuteFunctionDialog from "@/components/cloud-functions/ExecuteFunctionDialog";

/**
 * Cloud Functions Page Component
 *
 * This page is integrated with the Action Registry system, making all cloud function management
 * actions available to the AI assistant. The page controller provides the following actions:
 * - fetchFunctions: List all cloud functions with metadata and stats
 * - createFunction: Create new cloud functions with validation
 * - updateFunction: Update existing function code and configuration
 * - deleteFunction: Delete functions with confirmation
 * - executeFunction: Test function execution with parameters
 * - deployFunction: Deploy functions to production environment
 * - getFunctionLogs: View execution logs and monitoring data
 */
const CloudFunctionsPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { functions, selectedFunctionId, isLoading, error } = useAppSelector((state) => state.cloudFunction);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Get the page controller for AI assistant integration
  const cloudFunctionsPageController = controllerRegistry.getPageController('cloud-functions');
  const isRegistered = !!cloudFunctionsPageController;

  // Create a wrapper for executeAction that uses the registry directly
  const executeAction = useCallback(async (actionId: string, params: Record<string, unknown>) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    
    const fullActionId = actionId.includes('.') ? actionId : `cloud-functions.${actionId}`;
    
    // Build a basic action context
    const context = {
      user: {
        userId: currentUser.id,
        username: currentUser.email,
        email: currentUser.email,
        roles: [],
        permissions: [],
        organizationId: currentOrg?.id
      },
      organization: currentOrg ? {
        id: currentOrg.id,
        name: currentOrg.name,
        settings: currentOrg.settings || {},
        permissions: [],
        features: []
      } : undefined,
      page: {
        pageId: 'cloud-functions',
        pageName: 'Cloud Functions',
        state: {},
        props: {},
        metadata: {
          category: 'development',
          tags: ['functions', 'serverless', 'cloud'],
          permissions: []
        }
      },
      navigation: {
        router,
        currentPath: router.asPath,
        breadcrumbs: [
          { label: 'Home', path: '/' },
          { label: 'Cloud Functions', path: '/cloud-functions' }
        ]
      },
      timestamp: new Date()
    };
    
    return controllerRegistry.executeAction(fullActionId, params, context);
  }, [currentUser, currentOrg, router]);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [selectedFunction, setSelectedFunctionLocal] = useState<CloudFunction | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  // Filter functions based on search and tab
  const filteredFunctions = functions.filter((func) => {
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "active" && func.status === "active") || 
      (activeTab === "disabled" && func.status === "disabled") ||
      (activeTab === "draft" && func.status === "draft") ||
      (activeTab === "error" && func.status === "error");

    const matchesSearch = 
      searchTerm === "" ||
      func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.category?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleCreateFunction = async (functionData: CreateFunctionRequest) => {
    try {
      if (isRegistered && executeAction) {
        const result = await executeAction('createFunction', functionData as unknown as Record<string, unknown>);
        if (result.success) {
          // Add to local state
          dispatch(addFunction(functionData));
          sonnerToast.success('Function created successfully');
        } else {
          throw new Error(result.error || 'Failed to create function');
        }
      } else {
        // Fallback to direct Redux dispatch
        dispatch(addFunction(functionData));
        sonnerToast.success('Function created successfully');
      }
    } catch (error) {
      console.error('Failed to create function:', error);
      sonnerToast.error(`Failed to create function: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleExecuteFunction = async (request: ExecuteFunctionRequest): Promise<ExecuteFunctionResponse> => {
    try {
      if (isRegistered && executeAction) {
        const result = await executeAction('executeFunction', request as unknown as Record<string, unknown>);
        if (result.success) {
          return result.data as ExecuteFunctionResponse;
        } else {
          throw new Error(result.error || 'Function execution failed');
        }
      } else {
        // Mock execution for fallback
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              result: {
                message: "Function executed successfully (mock)",
                timestamp: new Date().toISOString(),
                mockData: "This is a mock response"
              },
              executionTime: Math.floor(Math.random() * 500) + 50,
              timestamp: new Date().toISOString()
            });
          }, 1000);
        });
      }
    } catch (error) {
      console.error('Failed to execute function:', error);
      throw error;
    }
  };

  const handleToggleStatus = async (functionId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    
    try {
      if (isRegistered && executeAction) {
        const result = await executeAction('updateFunction', {
          functionName: functions.find(f => f.id === functionId)?.name,
          status: newStatus
        });
        if (result.success) {
          dispatch(updateFunction({ id: functionId, updates: { status: newStatus } }));
          sonnerToast.success(`Function ${newStatus === 'active' ? 'activated' : 'disabled'}`);
        } else {
          throw new Error(result.error || 'Failed to update function');
        }
      } else {
        // Fallback to direct Redux dispatch
        dispatch(updateFunction({ id: functionId, updates: { status: newStatus } }));
        sonnerToast.success(`Function ${newStatus === 'active' ? 'activated' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Failed to toggle function status:', error);
      sonnerToast.error(`Failed to update function: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteFunction = async (functionId: string, functionName: string) => {
    try {
      if (isRegistered && executeAction) {
        const result = await executeAction('deleteFunction', {
          functionName,
          confirmDelete: true
        });
        if (result.success) {
          dispatch(deleteFunction(functionId));
          sonnerToast.success('Function deleted successfully');
        } else {
          throw new Error(result.error || 'Failed to delete function');
        }
      } else {
        // Fallback to direct Redux dispatch
        dispatch(deleteFunction(functionId));
        sonnerToast.success('Function deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete function:', error);
      sonnerToast.error(`Failed to delete function: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleViewFunction = (func: CloudFunction) => {
    dispatch(setSelectedFunction(func.id));
    setViewMode('detail');
  };

  const handleBackToList = () => {
    dispatch(setSelectedFunction(null));
    setViewMode('list');
  };

  const handleCloneFunction = async (sourceFunction: CloudFunction) => {
    const newName = prompt(`Enter a name for the cloned function:`, `${sourceFunction.name}_copy`);
    if (!newName) return;

    if (functions.some(f => f.name === newName)) {
      sonnerToast.error('A function with that name already exists');
      return;
    }

    try {
      if (isRegistered && executeAction) {
        const result = await executeAction('cloneFunction', {
          sourceFunctionName: sourceFunction.name,
          newFunctionName: newName,
          newDescription: `Clone of ${sourceFunction.description}`
        } as unknown as Record<string, unknown>);
        
        if (result.success) {
          // Add to local state
          const clonedFunction: CloudFunction = {
            ...sourceFunction,
            id: `cloned_${Date.now()}`,
            name: newName,
            description: `Clone of ${sourceFunction.description}`,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tags: [...(sourceFunction.tags || []), 'cloned']
          };
          dispatch(addFunction(clonedFunction));
          sonnerToast.success(`Function cloned successfully as "${newName}"`);
        } else {
          throw new Error(result.error || 'Failed to clone function');
        }
      } else {
        // Fallback to direct Redux dispatch
        const clonedFunction: CloudFunction = {
          ...sourceFunction,
          id: `cloned_${Date.now()}`,
          name: newName,
          description: `Clone of ${sourceFunction.description}`,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tags: [...(sourceFunction.tags || []), 'cloned']
        };
        dispatch(addFunction(clonedFunction));
        sonnerToast.success(`Function cloned successfully as "${newName}"`);
      }
    } catch (error) {
      console.error('Failed to clone function:', error);
      sonnerToast.error(`Failed to clone function: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshFunctions = async () => {
    try {
      sonnerToast.info("Refreshing functions...");
      
      if (isRegistered && executeAction) {
        const result = await executeAction('fetchFunctions', { includeStats: true });
        if (result.success) {
          sonnerToast.success("Functions refreshed successfully");
        } else {
          throw new Error(result.error || 'Failed to refresh functions');
        }
      } else {
        // Mock refresh
        sonnerToast.success("Functions refreshed successfully");
      }
    } catch (error) {
      console.error('Failed to refresh functions:', error);
      sonnerToast.error(`Failed to refresh functions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disabled':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'error':
        return 'destructive';
      case 'disabled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (viewMode === 'detail' && selectedFunctionId) {
    return <FunctionDetail onBack={handleBackToList} />;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cloud Functions</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage serverless functions for your organization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshFunctions}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Function
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search functions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="all">All ({functions.length})</TabsTrigger>
                <TabsTrigger value="active">
                  Active ({functions.filter(f => f.status === 'active').length})
                </TabsTrigger>
                <TabsTrigger value="disabled">
                  Disabled ({functions.filter(f => f.status === 'disabled').length})
                </TabsTrigger>
                <TabsTrigger value="draft">
                  Draft ({functions.filter(f => f.status === 'draft').length})
                </TabsTrigger>
                <TabsTrigger value="error">
                  Error ({functions.filter(f => f.status === 'error').length})
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
                          Function
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Runtime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Category</TableHead>
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
                    ) : filteredFunctions.length > 0 ? (
                      filteredFunctions.map((func) => (
                        <TableRow key={func.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getStatusIcon(func.status)}
                              <div>
                                <div className="font-medium">{func.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {func.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {func.description || 'No description'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{func.language}</Badge>
                          </TableCell>
                          <TableCell>{func.runtime}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={func.status === "active"}
                                onCheckedChange={() => handleToggleStatus(func.id, func.status)}
                              />
                              <Badge variant={getStatusBadgeVariant(func.status)}>
                                {func.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {func.category && (
                              <Badge variant="secondary">{func.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(func.updatedAt).toLocaleDateString()}
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
                                <DropdownMenuItem onClick={() => handleViewFunction(func)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit function
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedFunctionLocal(func);
                                    setExecuteDialogOpen(true);
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Test function
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(func.code);
                                  sonnerToast.success('Code copied to clipboard');
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy code
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCloneFunction(func)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clone function
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the function "${func.name}"?`)) {
                                      handleDeleteFunction(func.id, func.name);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete function
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          {searchTerm ? (
                            <div className="text-muted-foreground">
                              No functions found matching "{searchTerm}"
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              No functions found. Create your first function to get started.
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

      {/* Create Function Dialog */}
      <CreateFunctionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateFunction={handleCreateFunction}
        existingFunctionNames={functions.map(f => f.name)}
      />

      {/* Execute Function Dialog */}
      <ExecuteFunctionDialog
        open={executeDialogOpen}
        onOpenChange={setExecuteDialogOpen}
        cloudFunction={selectedFunction}
        onExecuteFunction={handleExecuteFunction}
      />
    </>
  );
};

export default CloudFunctionsPage;