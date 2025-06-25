import React, { useEffect, useState } from "react";
import { mcpServersApi } from '@/services/api/mcpServers';
import { useAppSelector } from "@/store/hooks";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Server,
  Zap,
  Play,
  Pause,
  Trash2,
  Settings,
  TestTube,
  Eye,
  Activity
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
import { MCPServer } from "@/types/MCPServerTypes";
import MCPServerCreateDialog from "@/components/mcp/MCPServerCreateDialog";
import MCPServerEditDialog from "@/components/mcp/MCPServerEditDialog";
import MCPServerDetailView from "@/components/mcp/MCPServerDetailView";

const MCPServers = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  
  const effectiveOrgId = currentOrg?.id || authOrgId;

  // Use modern page controller integration
  const pageController = usePageController({
    pageId: 'mcp-servers',
    pageName: 'MCP Servers',
    description: 'Manage Model Context Protocol (MCP) servers for AI assistant integration. Configure tools, resources, and capabilities.',
    category: 'ai-integration',
    permissions: ['organization-admin', 'ai-manager'],
    tags: ['mcp', 'ai', 'servers', 'integration', 'tools']
  });

  const { hasPermission } = usePermission();
  const canManageServers = hasPermission('org_admin') || hasPermission('ai_manager');
  const { toast } = useToast();

  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailViewOpen, setDetailViewOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);

  const fetchServers = async () => {
    if (!effectiveOrgId) return;
    
    setIsLoading(true);
    setControllerError(null);
    
    try {
      const result = await mcpServersApi.getOrganizationMCPServers(effectiveOrgId);
      if (result.success && result.data) {
        setServers(result.data);
      } else {
        setControllerError(result.error || 'Failed to load MCP servers');
      }
    } catch (error) {
      setControllerError('Failed to load MCP servers');
      console.error('Error fetching MCP servers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveOrgId) {
      fetchServers();
    }
  }, [effectiveOrgId]);

  const runSearchAction = async (term: string) => {
    if (!pageController.isRegistered) return;
    
    try {
      await pageController.executeAction('searchMCPServers', { query: term });
    } catch (error) {
      console.error('Search action failed:', error);
    }
  };

  const filteredServers = servers.filter(
    (server) =>
      server.name.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
      server.description.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
      server.type.toLowerCase().includes(localSearchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadge = (status: MCPServer['status']) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "connecting":
        return <Badge variant="outline" className="animate-pulse">Connecting</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: MCPServer['type']) => {
    switch (type) {
      case "stdio":
        return <Badge variant="outline">STDIO</Badge>;
      case "sse":
        return <Badge variant="outline">SSE</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleRefreshServers = async () => {
    if (!pageController.isRegistered || !effectiveOrgId) {
      setControllerError("Cannot refresh: No organization context");
      return;
    }
    
    setIsRefreshing(true);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('viewMCPServers', { orgId: effectiveOrgId });
      if (result.success) {
        toast({
          title: "Success",
          description: "MCP servers list refreshed successfully",
        });
        await fetchServers();
      } else {
        setControllerError(`Failed to refresh servers: ${result.error}`);
      }
    } catch (error) {
      setControllerError("Failed to refresh servers");
      console.error('Refresh servers error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestConnection = async (server: MCPServer) => {
    if (!pageController.isRegistered) return;
    
    try {
      const result = await pageController.executeAction('testMCPServerConnection', {
        serverId: server.id
      });
      if (result.success) {
        const connectionTest = result.data as any;
        toast({
          title: "Connection Test",
          description: connectionTest?.connectionTest?.success
            ? "Connection successful"
            : `Connection failed: ${connectionTest?.connectionTest?.error}`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Failed to test connection",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (server: MCPServer) => {
    if (!canManageServers || !pageController.isRegistered) return;
    
    const newStatus = server.status === 'active' ? 'inactive' : 'active';
    
    try {
      const result = await pageController.executeAction('updateMCPServer', {
        serverId: server.id,
        status: newStatus
      });
      if (result.success) {
        toast({
          title: "Success",
          description: `Server ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        });
        await fetchServers();
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update server status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteServer = async (server: MCPServer) => {
    if (!canManageServers || !pageController.isRegistered) return;
    
    if (confirm(`Are you sure you want to delete "${server.name}"? This action cannot be undone.`)) {
      try {
        const result = await pageController.executeAction('deleteMCPServer', {
          serverId: server.id,
          reason: 'Deleted by admin'
        });
        if (result.success) {
          toast({
            title: "Success",
            description: `Server "${server.name}" has been deleted`,
          });
          await fetchServers();
        } else {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete server",
          variant: "destructive"
        });
      }
    }
  };

  const handleOpenServerDetail = (server: MCPServer) => {
    setSelectedServer(server);
    setDetailViewOpen(true);
  };

  const handleOpenEditDialog = (server: MCPServer) => {
    setSelectedServer(server);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Server className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">MCP Servers</h1>
              <p className="text-muted-foreground mt-1">
                Manage Model Context Protocol servers for {currentOrg?.name || 'your organization'}
              </p>
            </div>
          </div>
        </div>

        {controllerError && (
          <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
            {controllerError}
          </div>
        )}

        <div className="flex items-center gap-2">
          {pageController.isRegistered && (
            <div className="flex items-center gap-2 mr-2">
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                {pageController.getAvailableActions().length} AI actions
              </Badge>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshServers}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManageServers && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MCP Servers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search servers..."
                value={localSearchTerm}
                onChange={(e) => {
                  setLocalSearchTerm(e.target.value);
                  runSearchAction(e.target.value);
                }}
                className="pl-8"
              />
            </div>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <div className="flex items-center">
                      Server
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Last Connected</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={index}>
                        {Array(7)
                          .fill(0)
                          .map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                ) : filteredServers.length > 0 ? (
                  filteredServers.map((server) => (
                    <TableRow key={server.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                            <Server className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">{server.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {server.capabilities?.tools?.length || 0} tools, {server.capabilities?.resources?.length || 0} resources
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(server.type)}</TableCell>
                      <TableCell>{getStatusBadge(server.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{server.description}</TableCell>
                      <TableCell>
                        {server.lastConnectedAt ? formatDate(server.lastConnectedAt) : "Never"}
                      </TableCell>
                      <TableCell>{formatDate(server.createdAt)}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleOpenServerDetail(server)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleTestConnection(server)}>
                              <TestTube className="h-4 w-4 mr-2" />
                              Test connection
                            </DropdownMenuItem>
                            {canManageServers && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleOpenEditDialog(server)}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Edit configuration
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(server)}>
                                  {server.status === 'active' ? (
                                    <>
                                      <Pause className="h-4 w-4 mr-2" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Activate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteServer(server)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete server
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {localSearchTerm ? (
                        <div className="text-muted-foreground">
                          No servers found matching "{localSearchTerm}"
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          No MCP servers configured. Add your first server to get started.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Server Dialog */}
      <MCPServerCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchServers}
      />

      {/* Edit Server Dialog */}
      {selectedServer && (
        <MCPServerEditDialog
          server={selectedServer}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onServerUpdated={fetchServers}
        />
      )}

      {/* Server Detail View */}
      {selectedServer && (
        <MCPServerDetailView
          server={selectedServer}
          open={detailViewOpen}
          onOpenChange={setDetailViewOpen}
        />
      )}
    </div>
  );
};

export default MCPServers;