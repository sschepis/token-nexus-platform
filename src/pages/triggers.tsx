import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
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
  Zap,
  Play,
  Copy,
  Edit,
  Trash2,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Database,
  Code2,
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
import {
  addTrigger,
  updateTrigger,
  deleteTrigger,
  setSelectedTrigger,
  setTriggerStatus,
} from "@/store/slices/triggerSlice";
import { ParseTrigger, CreateTriggerRequest, TriggerType } from "@/types/triggers";
import { CreateTriggerDialog } from "@/components/triggers/CreateTriggerDialog";

/**
 * Triggers Page Component
 *
 * This page manages Parse triggers for custom objects in the organization.
 * Triggers are executed automatically when certain events occur on Parse objects.
 * 
 * Features:
 * - Create triggers for beforeSave, afterSave, beforeDelete, afterDelete, beforeFind, afterFind
 * - Manage triggers for all custom classes in the organization
 * - Advanced code editor with Parse Cloud Code syntax
 * - Real-time execution monitoring and statistics
 * - AI assistant integration for automated trigger management
 */
const TriggersPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { triggers, selectedTriggerId, isLoading, error, availableClasses } = useAppSelector((state) => state.trigger);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { user: currentUser } = useAppSelector((state) => state.auth);

  // Use modern page controller integration
  const pageController = usePageController('triggers');
  const canManageTriggers = usePermission('triggers:manage');
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedTriggerType, setSelectedTriggerType] = useState<TriggerType | "all">("all");
  const [isLoadingTriggers, setIsLoadingTriggers] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);

  // Filter triggers based on search, tab, class, and trigger type
  const filteredTriggers = triggers.filter((trigger) => {
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "active" && trigger.status === "active") || 
      (activeTab === "disabled" && trigger.status === "disabled") ||
      (activeTab === "draft" && trigger.status === "draft") ||
      (activeTab === "error" && trigger.status === "error");

    const matchesSearch = 
      searchTerm === "" ||
      trigger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trigger.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trigger.className.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = selectedClass === "all" || trigger.className === selectedClass;
    const matchesTriggerType = selectedTriggerType === "all" || trigger.triggerType === selectedTriggerType;

    return matchesTab && matchesSearch && matchesClass && matchesTriggerType;
  });

  const handleCreateTrigger = async (triggerData: CreateTriggerRequest) => {
    if (!canManageTriggers) {
      setControllerError('You do not have permission to create triggers');
      return;
    }

    try {
      if (pageController.isRegistered) {
        const result = await pageController.executeAction('createTrigger', triggerData as unknown as Record<string, unknown>);
        if (result.success) {
          dispatch(addTrigger(triggerData));
          toast({
            title: "Success",
            description: "Trigger created successfully",
          });
        } else {
          throw new Error(result.error || 'Failed to create trigger');
        }
      } else {
        dispatch(addTrigger(triggerData));
        toast({
          title: "Success",
          description: "Trigger created successfully",
        });
      }
    } catch (error) {
      console.error('Failed to create trigger:', error);
      setControllerError(`Failed to create trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  const handleToggleStatus = async (triggerId: string, currentStatus: string) => {
    if (!canManageTriggers) {
      setControllerError('You do not have permission to modify triggers');
      return;
    }

    const newStatus = currentStatus === "active" ? "disabled" : "active";
    
    try {
      if (pageController.isRegistered) {
        const result = await pageController.executeAction('toggleTriggerStatus', {
          triggerId,
          status: newStatus
        });
        if (result.success) {
          dispatch(setTriggerStatus({ id: triggerId, status: newStatus }));
          toast({
            title: "Success",
            description: `Trigger ${newStatus === 'active' ? 'activated' : 'disabled'}`,
          });
        } else {
          throw new Error(result.error || 'Failed to update trigger');
        }
      } else {
        dispatch(setTriggerStatus({ id: triggerId, status: newStatus }));
        toast({
          title: "Success",
          description: `Trigger ${newStatus === 'active' ? 'activated' : 'disabled'}`,
        });
      }
    } catch (error) {
      console.error('Failed to toggle trigger status:', error);
      setControllerError(`Failed to update trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteTrigger = async (triggerId: string, triggerName: string) => {
    if (!canManageTriggers) {
      setControllerError('You do not have permission to delete triggers');
      return;
    }

    try {
      if (pageController.isRegistered) {
        const result = await pageController.executeAction('deleteTrigger', { triggerId });
        if (result.success) {
          dispatch(deleteTrigger(triggerId));
          toast({
            title: "Success",
            description: "Trigger deleted successfully",
          });
        } else {
          throw new Error(result.error || 'Failed to delete trigger');
        }
      } else {
        dispatch(deleteTrigger(triggerId));
        toast({
          title: "Success",
          description: "Trigger deleted successfully",
        });
      }
    } catch (error) {
      console.error('Failed to delete trigger:', error);
      setControllerError(`Failed to delete trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloneTrigger = async (sourceTrigger: ParseTrigger) => {
    if (!canManageTriggers) {
      setControllerError('You do not have permission to clone triggers');
      return;
    }

    const newName = prompt(`Enter a name for the cloned trigger:`, `${sourceTrigger.name}_copy`);
    if (!newName) return;

    if (triggers.some(t => t.name === newName)) {
      setControllerError('A trigger with that name already exists');
      return;
    }

    try {
      const clonedTrigger: CreateTriggerRequest = {
        name: newName,
        description: `Clone of ${sourceTrigger.description}`,
        className: sourceTrigger.className,
        triggerType: sourceTrigger.triggerType,
        code: sourceTrigger.code,
        conditions: sourceTrigger.conditions,
        tags: [...(sourceTrigger.tags || []), 'cloned']
      };
      
      if (pageController.isRegistered) {
        const result = await pageController.executeAction('cloneTrigger', clonedTrigger as unknown as Record<string, unknown>);
        if (result.success) {
          dispatch(addTrigger(clonedTrigger));
          toast({
            title: "Success",
            description: `Trigger cloned successfully as "${newName}"`,
          });
        } else {
          throw new Error(result.error || 'Failed to clone trigger');
        }
      } else {
        dispatch(addTrigger(clonedTrigger));
        toast({
          title: "Success",
          description: `Trigger cloned successfully as "${newName}"`,
        });
      }
    } catch (error) {
      console.error('Failed to clone trigger:', error);
      setControllerError(`Failed to clone trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefresh = async () => {
    if (!pageController.isRegistered) return;
    
    setIsLoadingTriggers(true);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('fetchTriggers', { includeStats: true });
      if (result.success) {
        // In a real implementation, this would fetch from the server
        toast({
          title: "Success",
          description: "Triggers refreshed successfully",
        });
      } else {
        setControllerError(result.error || 'Failed to refresh triggers');
      }
    } catch (error) {
      console.error('Failed to refresh triggers:', error);
      setControllerError(`Failed to refresh triggers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingTriggers(false);
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

  const getTriggerTypeIcon = (triggerType: TriggerType) => {
    switch (triggerType) {
      case 'beforeSave':
      case 'afterSave':
        return <Database className="h-4 w-4" />;
      case 'beforeDelete':
      case 'afterDelete':
        return <Trash2 className="h-4 w-4" />;
      case 'beforeFind':
      case 'afterFind':
        return <Search className="h-4 w-4" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  const getTriggerTypeColor = (triggerType: TriggerType) => {
    switch (triggerType) {
      case 'beforeSave':
        return 'text-blue-600 bg-blue-50';
      case 'afterSave':
        return 'text-green-600 bg-green-50';
      case 'beforeDelete':
        return 'text-red-600 bg-red-50';
      case 'afterDelete':
        return 'text-orange-600 bg-orange-50';
      case 'beforeFind':
        return 'text-purple-600 bg-purple-50';
      case 'afterFind':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parse Triggers</h1>
            <p className="text-muted-foreground mt-1">
              Manage automatic triggers for your Parse objects and classes
            </p>
          </div>

          {controllerError && (
            <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
              {controllerError}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoadingTriggers}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Trigger
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search triggers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Classes</option>
                  {availableClasses.map(className => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>

                <select
                  value={selectedTriggerType}
                  onChange={(e) => setSelectedTriggerType(e.target.value as TriggerType | "all")}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="beforeSave">Before Save</option>
                  <option value="afterSave">After Save</option>
                  <option value="beforeDelete">Before Delete</option>
                  <option value="afterDelete">After Delete</option>
                  <option value="beforeFind">Before Find</option>
                  <option value="afterFind">After Find</option>
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
                <TabsTrigger value="all">All ({triggers.length})</TabsTrigger>
                <TabsTrigger value="active">
                  Active ({triggers.filter(t => t.status === 'active').length})
                </TabsTrigger>
                <TabsTrigger value="disabled">
                  Disabled ({triggers.filter(t => t.status === 'disabled').length})
                </TabsTrigger>
                <TabsTrigger value="draft">
                  Draft ({triggers.filter(t => t.status === 'draft').length})
                </TabsTrigger>
                <TabsTrigger value="error">
                  Error ({triggers.filter(t => t.status === 'error').length})
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
                          Trigger
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Executions</TableHead>
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
                    ) : filteredTriggers.length > 0 ? (
                      filteredTriggers.map((trigger) => (
                        <TableRow key={trigger.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {getStatusIcon(trigger.status)}
                              <div>
                                <div className="font-medium">{trigger.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {trigger.id.slice(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{trigger.className}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium ${getTriggerTypeColor(trigger.triggerType)}`}>
                              {getTriggerTypeIcon(trigger.triggerType)}
                              {trigger.triggerType}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate">
                              {trigger.description || 'No description'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={trigger.status === "active"}
                                onCheckedChange={() => handleToggleStatus(trigger.id, trigger.status)}
                              />
                              <Badge variant={getStatusBadgeVariant(trigger.status)}>
                                {trigger.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{trigger.executionCount || 0}</div>
                              {trigger.errorCount && trigger.errorCount > 0 && (
                                <div className="text-red-600 text-xs">
                                  {trigger.errorCount} errors
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(trigger.updatedAt).toLocaleDateString()}
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
                                <DropdownMenuItem onClick={() => {
                                  dispatch(setSelectedTrigger(trigger.id));
                                  // Navigate to edit view
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit trigger
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  navigator.clipboard.writeText(trigger.code);
                                  toast({
                                    title: "Success",
                                    description: "Code copied to clipboard",
                                  });
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy code
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCloneTrigger(trigger)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Clone trigger
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the trigger "${trigger.name}"?`)) {
                                      handleDeleteTrigger(trigger.id, trigger.name);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete trigger
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          {searchTerm || selectedClass !== "all" || selectedTriggerType !== "all" ? (
                            <div className="text-muted-foreground">
                              No triggers found matching the current filters
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              No triggers found. Create your first trigger to get started.
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

      <CreateTriggerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateTrigger={handleCreateTrigger}
      />
    </>
  );
};

export default TriggersPage;