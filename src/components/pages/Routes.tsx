import React, { useState, useEffect } from "react";
import { RouteHandler } from "@/types/routes";
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
import { usePageController } from "@/hooks/usePageController";
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
import { HttpMethod, Route } from "@/types/routes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation, Plus, Trash2, RefreshCw } from "lucide-react";
import { useRouter } from "next/router";

const Routes = () => {
  const { toast } = useToast();
  const router = useRouter();
  
  // Try to use the controller, but fall back to Redux if not available
  const { executeAction, isRegistered } = usePageController({
    pageId: 'routes',
    pageName: 'Routes Management',
    description: 'Manage application routes, endpoints, and navigation',
    category: 'system',
    permissions: ['routes:read', 'routes:write'],
    tags: ['routes', 'navigation', 'management']
  });
  const dispatch = useAppDispatch();
  const { routes: reduxRoutes, selectedRouteId: reduxSelectedRouteId } = useAppSelector((state) => state.route);
  
  // Local state
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [newRouteOpen, setNewRouteOpen] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newMethod, setNewMethod] = useState<HttpMethod>("GET");
  const [newTarget, setNewTarget] = useState("");
  const [newType, setNewType] = useState<"page" | "function" | "redirect">("page");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [useController, setUseController] = useState(false);

  // Determine which data source to use
  const effectiveRoutes = useController ? routes : reduxRoutes;
  const effectiveSelectedRouteId = useController ? selectedRouteId : reduxSelectedRouteId;

  // Get the selected route from the state
  const selectedRoute = effectiveSelectedRouteId 
    ? effectiveRoutes.find(route => route.id === effectiveSelectedRouteId) 
    : null;

  // Check if controller is available and switch to it
  useEffect(() => {
    if (isRegistered && executeAction) {
      setUseController(true);
      fetchRoutesFromController();
    } else {
      setUseController(false);
    }
  }, [isRegistered, executeAction]);

  const fetchRoutesFromController = async () => {
    if (!executeAction) return;
    
    setLoading(true);
    try {
      const result = await executeAction('fetchRoutes', { includeInactive: true });
      if (result.success && result.data) {
        const routesData = result.data as { routes: Route[] };
        setRoutes(routesData.routes || []);
      } else {
        toast({
          title: "Error fetching routes",
          description: result.error || "Failed to load routes",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error fetching routes",
        description: "Failed to load routes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter routes based on active tab and search term
  const filteredRoutes = effectiveRoutes.filter((route) => {
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

    if (useController && executeAction) {
      // Use controller
      try {
        const result = await executeAction('addRoute', {
          path: newPath,
          method: newMethod,
          handlerType: newType,
          target: newTarget,
          protected: true
        });

        if (result.success) {
          toast({
            title: "Route created",
            description: result.message || `Added route ${newPath} with ${newMethod} method`,
          });
          
          setNewRouteOpen(false);
          setNewPath("");
          setNewTarget("");
          
          // Refresh routes list
          await fetchRoutesFromController();
        } else {
          toast({
            title: "Error creating route",
            description: result.error || "Failed to create route",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error creating route",
          description: "Failed to create route",
          variant: "destructive",
        });
      }
    } else {
      // Use Redux fallback
      dispatch(addRoute({
        path: newPath,
        method: newMethod,
        handler: {
          type: newType,
          target: newTarget,
          description: `${newType === "page" ? "Page" : newType === "function" ? "Function" : "Redirect"} for ${newPath}`
        }
      }));
      
      toast({
        title: "Route created",
        description: `Added route ${newPath} with ${newMethod} method`,
      });
      
      setNewRouteOpen(false);
      setNewPath("");
      setNewTarget("");
    }
  };

  const handleToggleActive = async (routeId: string, currentActive: boolean) => {
    if (useController && executeAction) {
      // Use controller
      try {
        const result = await executeAction('toggleRouteStatus', {
          routeId,
          active: !currentActive
        });

        if (result.success) {
          toast({
            title: `Route ${!currentActive ? "activated" : "deactivated"}`,
            description: result.message || `The route has been ${!currentActive ? "activated" : "deactivated"}`,
          });
          
          // Refresh routes list
          await fetchRoutesFromController();
        } else {
          toast({
            title: "Error updating route",
            description: result.error || "Failed to update route status",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error updating route",
          description: "Failed to update route status",
          variant: "destructive",
        });
      }
    } else {
      // Use Redux fallback
      dispatch(updateRoute({
        routeId,
        updates: { active: !currentActive }
      }));
      
      toast({
        title: `Route ${!currentActive ? "activated" : "deactivated"}`,
        description: `The route has been ${!currentActive ? "activated" : "deactivated"}`,
      });
    }
  };

  const handleViewRoute = (routeId: string) => {
    if (useController) {
      setSelectedRouteId(routeId);
    } else {
      dispatch(setSelectedRoute(routeId));
    }
    setActiveTab("detail");
  };

  const handleSelectRoute = (routeId: string | null) => {
    if (useController) {
      setSelectedRouteId(routeId);
    } else {
      dispatch(setSelectedRoute(routeId));
    }
    if (routeId === null) {
      setActiveTab("all");
    }
  };

  const handleDeleteRoute = async (routeId: string, path: string) => {
    if (confirm(`Are you sure you want to delete the route ${path}?`)) {
      if (useController && executeAction) {
        // Use controller
        try {
          const result = await executeAction('deleteRoute', { routeId });

          if (result.success) {
            toast({
              title: "Route deleted",
              description: result.message || `Route ${path} has been deleted`,
            });
            
            // Refresh routes list
            await fetchRoutesFromController();
          } else {
            toast({
              title: "Error deleting route",
              description: result.error || "Failed to delete route",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error deleting route",
            description: "Failed to delete route",
            variant: "destructive",
          });
        }
      } else {
        // Use Redux fallback
        dispatch(deleteRoute(routeId));
        toast({
          title: "Route deleted",
          description: `Route ${path} has been deleted`,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Routes</h1>
            <p className="text-muted-foreground mt-2">
              Manage API routes, page routes, and redirects
              {useController && (
                <Badge variant="outline" className="ml-2">
                  Controller Registry
                </Badge>
              )}
              {!useController && (
                <Badge variant="secondary" className="ml-2">
                  Redux Store
                </Badge>
              )}
            </p>
          </div>
          
          <div className="flex gap-2">
            {useController && (
              <Button
                variant="outline"
                onClick={fetchRoutesFromController}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            
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
          </div>
        </div>

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
            {activeTab === "detail" && (
              <TabsTrigger value="detail">Route Detail</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <RouteTable 
              routes={filteredRoutes} 
              handleToggleActive={handleToggleActive} 
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <RouteTable 
              routes={filteredRoutes} 
              handleToggleActive={handleToggleActive} 
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="inactive" className="space-y-4">
            <RouteTable 
              routes={filteredRoutes} 
              handleToggleActive={handleToggleActive} 
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="protected" className="space-y-4">
            <RouteTable 
              routes={filteredRoutes} 
              handleToggleActive={handleToggleActive} 
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="public" className="space-y-4">
            <RouteTable 
              routes={filteredRoutes} 
              handleToggleActive={handleToggleActive} 
              handleViewRoute={handleViewRoute}
              handleDeleteRoute={handleDeleteRoute}
              loading={loading}
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
  );
};

interface RouteTableProps {
  routes: Route[];
  handleToggleActive: (id: string, active: boolean) => void;
  handleViewRoute: (id: string) => void;
  handleDeleteRoute: (id: string, path: string) => void;
  loading?: boolean;
}

const RouteTable = ({ routes, handleToggleActive, handleViewRoute, handleDeleteRoute, loading }: RouteTableProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Route List</CardTitle>
          <CardDescription>
            Loading routes...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

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
            {routes.length > 0 ? (
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
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDeleteRoute(route.id, route.path)}
                    >
                      Delete
                    </Button>
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

export default Routes;
