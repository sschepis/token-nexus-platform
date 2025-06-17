import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addRoute,
  deleteRoute,
  updateRoute,
  setSelectedRoute
} from "@/store/slices/routeSlice";
import RouteDetail from "@/components/routes/RouteDetail";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Label } from "@/components/ui/label";
import { HttpMethod, Route, RouteHandler } from "@/types/routes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation, Plus, Trash2, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/router";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { Alert, AlertDescription } from "@/components/ui/alert";

const RoutesPage = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { routes, selectedRouteId } = useAppSelector((state) => state.route);
  const [activeTab, setActiveTab] = useState("all");
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newMethod, setNewMethod] = useState<HttpMethod>("GET");
  const [newTarget, setNewTarget] = useState("");
  const [newType, setNewType] = useState<"page" | "function" | "redirect">("page");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [controllerRoutes, setControllerRoutes] = useState<Route[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'routes',
    pageName: 'Routes Management',
    description: 'Manage application routes, endpoints, and navigation',
    category: 'system',
    permissions: ['routes:read', 'routes:write'],
    tags: ['routes', 'navigation', 'management']
  });

  // Permission checks
  const { hasPermission } = usePermission();
  const canRead = hasPermission('routes:read');
  const canWrite = hasPermission('routes:write');

  // Load routes from controller
  const loadRoutes = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('fetchRoutes', { includeInactive: true });
      
      if (result.success && result.data) {
        const routesData = result.data as { routes: Route[]; total: number; sources: string[] };
        setControllerRoutes(routesData.routes || []);
        toast({
          title: "Routes loaded",
          description: "Routes loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load routes');
        toast({
          title: "Error loading routes",
          description: result.error || 'Failed to load routes',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      setError('Failed to load routes');
      toast({
        title: "Error loading routes",
        description: 'Failed to load routes',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load routes on component mount
  useEffect(() => {
    if (pageController.isRegistered) {
      loadRoutes();
    }
  }, [pageController.isRegistered]);

  const selectedRoute = selectedRouteId 
    ? routes.find(route => route.id === selectedRouteId) 
    : null;

  // Use controller routes if available, fallback to Redux routes
  const allRoutes = controllerRoutes.length > 0 ? controllerRoutes : routes;
  
  const filteredRoutes = allRoutes.filter((route) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && route.active) ||
      (activeTab === "inactive" && !route.active) ||
      (activeTab === "protected" && route.protected) ||
      (activeTab === "public" && !route.protected);

    const matchesSearch =
      searchTerm === "" ||
      route.path.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleAddRoute = async () => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to create routes",
        variant: "destructive",
      });
      return;
    }

    if (!newPath.startsWith("/")) {
      toast({
        title: "Invalid route path",
        description: "Path must start with /",
        variant: "destructive",
      });
      return;
    }

    if (!newTarget) {
      toast({
        title: "Missing target",
        description: "Please provide a target for the route",
        variant: "destructive",
      });
      return;
    }

    if (!pageController.isRegistered) {
      toast({
        title: "Controller not available",
        description: "Controller not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await pageController.executeAction('addRoute', {
        path: newPath,
        method: newMethod,
        handlerType: newType,
        target: newTarget,
        protected: newType !== "redirect" // Default protection based on type
      });

      if (result.success) {
        toast({
          title: "Route created",
          description: `Route ${newPath} created successfully`,
        });
        
        // Also update Redux store for immediate UI update
        dispatch(addRoute({
          path: newPath,
          method: newMethod,
          handler: {
            type: newType,
            target: newTarget,
            description: `${newType === "page" ? "Page" : newType === "function" ? "Function" : "Redirect"} for ${newPath}`
          }
        }));
        
        // Refresh routes from controller
        await loadRoutes();
        
        setNewRouteOpen(false);
        setNewPath("");
        setNewTarget("");
      } else {
        toast({
          title: "Error creating route",
          description: result.error || 'Failed to create route',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating route:', error);
      toast({
        title: "Error creating route",
        description: 'Failed to create route',
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (routeId: string, currentActive: boolean) => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to modify routes",
        variant: "destructive",
      });
      return;
    }

    if (!pageController.isRegistered) {
      toast({
        title: "Controller not available",
        description: "Controller not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await pageController.executeAction('toggleRouteStatus', {
        routeId,
        active: !currentActive
      });

      if (result.success) {
        toast({
          title: "Route updated",
          description: `Route ${!currentActive ? "activated" : "deactivated"} successfully`,
        });
        
        // Update Redux store for immediate UI update
        dispatch(updateRoute({
          routeId,
          updates: { active: !currentActive }
        }));
        
        // Refresh routes from controller
        await loadRoutes();
      } else {
        toast({
          title: "Error updating route",
          description: result.error || 'Failed to toggle route status',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error toggling route status:', error);
      toast({
        title: "Error updating route",
        description: 'Failed to toggle route status',
        variant: "destructive",
      });
    }
  };

  const handleViewRoute = (routeId: string) => {
    dispatch(setSelectedRoute(routeId));
    setActiveTab("detail");
    // router.push(`/routes?detail=${routeId}`); // Optional: update URL for deep linking
  };

  const handleSelectRoute = (routeId: string | null) => {
    dispatch(setSelectedRoute(routeId));
    if (routeId === null) {
      setActiveTab("all");
      // router.push('/routes'); // Optional: update URL
    }
  };

  const handleDeleteRoute = async (routeId: string, path: string) => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete routes",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete the route ${path}?`)) {
      return;
    }

    if (!pageController.isRegistered) {
      toast({
        title: "Controller not available",
        description: "Controller not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await pageController.executeAction('deleteRoute', { routeId });

      if (result.success) {
        toast({
          title: "Route deleted",
          description: `Route ${path} deleted successfully`,
        });
        
        // Update Redux store for immediate UI update
        dispatch(deleteRoute(routeId));
        
        if (selectedRouteId === routeId) {
          handleSelectRoute(null);
        }
        
        // Refresh routes from controller
        await loadRoutes();
      } else {
        toast({
          title: "Error deleting route",
          description: result.error || 'Failed to delete route',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      toast({
        title: "Error deleting route",
        description: 'Failed to delete route',
        variant: "destructive",
      });
    }
  };

  const handleRefreshRoutes = async () => {
    await loadRoutes();
  };

  const handleSearchRoutes = async (query: string) => {
    if (!pageController.isRegistered || !query.trim()) {
      return;
    }

    try {
      const result = await pageController.executeAction('searchRoutes', {
        query: query.trim(),
        filters: {
          active: activeTab === "active" ? true : activeTab === "inactive" ? false : undefined,
          protected: activeTab === "protected" ? true : activeTab === "public" ? false : undefined
        }
      });

      if (result.success && result.data) {
        const searchData = result.data as { routes: Route[]; total: number; query: string; filters?: Record<string, unknown> };
        setControllerRoutes(searchData.routes || []);
      }
    } catch (error) {
      console.error('Error searching routes:', error);
    }
  };

  // Show permission error if user can't read routes
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
            <p className="text-muted-foreground mt-2">
              Manage API routes, page routes, and redirects
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view routes. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    // <AppLayout> // Removed AppLayout wrapper from here; _app.tsx handles it.
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
            <p className="text-muted-foreground mt-2">
              Manage API routes, page routes, and redirects
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleRefreshRoutes}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {canWrite && (
              <Dialog open={newRouteOpen} onOpenChange={setNewRouteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Navigation className="h-4 w-4 mr-2" />
                    Add Route
                  </Button>
                </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Route</DialogTitle>
                <DialogDescription>
                  Define a new route with its handler
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="path">Route Path</Label>
                  <Input
                    id="path"
                    placeholder="/api/resource"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="method">HTTP Method</Label>
                    <Select value={newMethod} onValueChange={(value) => setNewMethod(value as HttpMethod)}>
                      <SelectTrigger id="method">
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="type">Handler Type</Label>
                    <Select value={newType} onValueChange={(value) => setNewType(value as "page" | "function" | "redirect")}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">Page</SelectItem>
                        <SelectItem value="function">Function</SelectItem>
                        <SelectItem value="redirect">Redirect</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="target">Target ({newType === "page" ? "Component Name" : newType === "function" ? "Function Name" : "URL"})</Label>
                  <Input
                    id="target"
                    placeholder={newType === "page" ? "Dashboard" : newType === "function" ? "handleUserData" : "/new-location"}
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleAddRoute}>Create Route</Button>
              </div>
            </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Display local error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search routes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Routes</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
            <TabsTrigger value="protected">Protected</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            {selectedRoute && ( // Only show detail tab if a route is selected
              <TabsTrigger value="detail">Route Detail</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <RouteTable
              routes={filteredRoutes}
              handleToggleActive={handleToggleActive}
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <RouteTable
              routes={filteredRoutes}
              handleToggleActive={handleToggleActive}
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            <RouteTable
              routes={filteredRoutes}
              handleToggleActive={handleToggleActive}
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="protected" className="space-y-4">
            <RouteTable
              routes={filteredRoutes}
              handleToggleActive={handleToggleActive}
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="public" className="space-y-4">
            <RouteTable
              routes={filteredRoutes}
              handleToggleActive={handleToggleActive}
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="detail" className="space-y-4">
            {selectedRoute && (
              <RouteDetail
                route={selectedRoute}
                onClose={() => handleSelectRoute(null)}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    // </AppLayout>
  );
};

interface RouteTableProps {
  routes: Route[];
  handleToggleActive: (id: string, active: boolean) => void;
  handleViewRoute: (id: string) => void;
  handleDeleteRoute: (id: string, path: string) => void;
  isLoading?: boolean;
}

const RouteTable = ({ routes, handleToggleActive, handleViewRoute, handleDeleteRoute, isLoading = false }: RouteTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Route List</CardTitle>
        <CardDescription>
          All defined routes in your application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Methods</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading routes...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : routes.length > 0 ? (
              routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.path}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(route.methods).map((method) => (
                        <Badge key={method} variant="outline">{method}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {Object.values(route.methods).map((handler: RouteHandler) => (
                      <span key={handler.id} className="capitalize">
                        {handler.type}
                      </span>
                    ))[0]}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={route.active}
                      onCheckedChange={() => handleToggleActive(route.id, route.active)}
                      disabled={isLoading || !canWrite}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={route.protected ? "default" : "secondary"}>
                      {route.protected ? "Protected" : "Public"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewRoute(route.id)}
                      className="mr-2"
                      disabled={isLoading}
                    >
                      View
                    </Button>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDeleteRoute(route.id, route.path)}
                        disabled={isLoading}
                      >
                        Delete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No routes found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RoutesPage;