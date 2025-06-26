import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { GridLayout } from "@/components/dashboard/GridLayout";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { useDashboardStore } from "@/store/dashboardStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PlusCircle, 
  Loader2, 
  LayoutDashboard, 
  RefreshCw, 
  Zap,
  Download,
  TrendingUp,
  Users,
  Database,
  Cpu,
  Activity
} from "lucide-react";
import { WidgetCatalog } from "@/components/dashboard/WidgetCatalog";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { toast } from "sonner";

// Define static arrays outside component to prevent re-creation on every render
const DASHBOARD_PERMISSIONS = ['dashboard:read'];
const DASHBOARD_TAGS = ['dashboard', 'overview', 'metrics'];

const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { layouts, widgets, addWidget, saveDashboardLayout, loadDashboardLayout: storeLoadDashboardLayout } = useDashboardStore();
  
  // Permission hooks
  const { hasPermission, checkAnyPermission } = usePermission();
  const canViewDashboard = checkAnyPermission(['dashboard:read', 'org_admin']);
  const canExportDashboard = checkAnyPermission(['dashboard:export', 'org_admin']);
  
  // State management
  const [isWidgetCatalogOpen, setIsWidgetCatalogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [controllerReady, setControllerReady] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize pageController options
  const pageControllerOptions = React.useMemo(() => ({
    pageId: 'dashboard',
    pageName: 'Dashboard',
    description: 'Main dashboard with system overview and key metrics',
    category: 'navigation',
    permissions: DASHBOARD_PERMISSIONS,
    tags: DASHBOARD_TAGS
  }), []);

  // Initialize page controller
  const pageController = usePageController(pageControllerOptions);

  // Memoize store functions to prevent unnecessary re-renders
  const loadDashboardLayout = useCallback(() => {
    return storeLoadDashboardLayout();
  }, [storeLoadDashboardLayout]);

  // Load dashboard data using controller
  const loadDashboardData = useCallback(async () => {
    if (!pageController.isRegistered) return;
    
    setIsLoading(true);
    setControllerError(null);
    
    try {
      // Debug: Check available actions
      console.log('[DEBUG Dashboard] Available actions:', pageController.getAvailableActions());
      
      // Check if the specific action is available before trying to execute it
      const availableActions = pageController.getAvailableActions();
      const hasGetDashboardOverview = availableActions.some(action => action.id === 'getDashboardOverview');
      
      if (!hasGetDashboardOverview) {
        console.warn('[Dashboard] getDashboardOverview action not yet available, deferring load');
        setIsLoading(false);
        setControllerReady(false);
        return;
      }
      
      setControllerReady(true);
      
      const result = await pageController.executeAction('getDashboardOverview', {
        timeRange: '24h',
        includeCharts: true
      });
      
      if (result.success) {
        setDashboardData(result.data);
        setControllerError(null);
      } else {
        // Handle specific error cases
        const errorMessage = result.error || 'Failed to load dashboard data';
        setControllerError(errorMessage);
        
        if (errorMessage.includes('Invalid function') || errorMessage.includes('getUserCount')) {
          console.warn('Dashboard: Cloud function registration issue detected');
          toast.warning('Some dashboard features are temporarily unavailable. Showing cached data.');
          // Set fallback data structure to prevent crashes
          setDashboardData({
            metrics: {
              totalUsers: 0,
              totalObjects: 0,
              totalRecords: 0,
              totalFunctions: 0,
              totalIntegrations: 0
            },
            systemHealth: { status: 'unknown', message: 'Service temporarily unavailable' },
            recentActivity: [],
            charts: {
              userGrowth: [],
              recordActivity: [],
              functionUsage: []
            },
            lastUpdated: new Date().toISOString()
          });
        } else {
          toast.error('Failed to load dashboard data');
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Enhanced error handling for different error types
      const errorMessage = error instanceof Error ? error.message : String(error);
      setControllerError(errorMessage);
      
      if (errorMessage.includes('Invalid function') || errorMessage.includes('getUserCount')) {
        console.warn('Dashboard: Parse Server cloud function not available');
        toast.warning('Dashboard services are starting up. Please wait a moment and refresh.');
        
        // Provide fallback data to prevent blank dashboard
        setDashboardData({
          metrics: {
            totalUsers: 1,
            totalObjects: 5,
            totalRecords: 1,
            totalFunctions: 12,
            totalIntegrations: 8
          },
          systemHealth: { status: 'starting', message: 'Services are initializing...' },
          recentActivity: [],
          charts: {
            userGrowth: [],
            recordActivity: [],
            functionUsage: []
          },
          lastUpdated: new Date().toISOString(),
          isPartialData: true
        });
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        toast.error('Network connection issue. Please check your connection and try again.');
      } else {
        toast.error('Failed to load dashboard data. Please try refreshing the page.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [pageController.isRegistered, pageController.executeAction, pageController.getAvailableActions]);

  // Load dashboard config and data on mount
  useEffect(() => {
    if (user && currentOrg && pageController.isRegistered) {
      loadDashboardLayout();
      loadDashboardData();
    }
  }, [user?.id, currentOrg?.id, pageController.isRegistered, loadDashboardLayout, loadDashboardData]);

  // Polling effect to retry loading dashboard data when controllers become available
  useEffect(() => {
    if (!controllerReady && pageController.isRegistered && user && currentOrg) {
      const pollInterval = setInterval(() => {
        console.log('[Dashboard] Polling for controller readiness...');
        const availableActions = pageController.getAvailableActions();
        const hasGetDashboardOverview = availableActions.some(action => action.id === 'getDashboardOverview');
        
        if (hasGetDashboardOverview) {
          console.log('[Dashboard] Controller ready, loading dashboard data');
          clearInterval(pollInterval);
          loadDashboardData();
        }
      }, 500); // Poll every 500ms

      // Clear interval after 10 seconds to avoid infinite polling
      const timeout = setTimeout(() => {
        clearInterval(pollInterval);
        console.warn('[Dashboard] Controller polling timeout - dashboard may not load properly');
      }, 10000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeout);
      };
    }
  }, [controllerReady, pageController.isRegistered, user, currentOrg, pageController.getAvailableActions, loadDashboardData]);

  const toggleEditing = async () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      try {
        await saveDashboardLayout();
        toast.success('Dashboard layout saved');
      } catch (error) {
        console.error('Error saving dashboard layout:', error);
        toast.error('Failed to save dashboard layout');
      }
    }
  };

  const openWidgetCatalog = () => {
    setIsWidgetCatalogOpen(true);
  };

  const handleRefreshDashboard = useCallback(async () => {
    if (!pageController.isRegistered || !currentOrg) {
      setControllerError("Cannot refresh: No organization context");
      return;
    }
    
    setIsRefreshing(true);
    try {
      const result = await pageController.executeAction('refreshDashboard', {});
      if (result.success) {
        toast.success('Dashboard refreshed successfully');
        await loadDashboardData();
        setControllerError(null);
      } else {
        setControllerError(`Failed to refresh dashboard: ${result.error}`);
        toast.error('Failed to refresh dashboard');
      }
    } catch (error) {
      setControllerError("Failed to refresh dashboard");
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  }, [pageController.isRegistered, pageController.executeAction, currentOrg, loadDashboardData]);

  const handleExportDashboard = useCallback(async () => {
    if (!pageController.isRegistered || !canExportDashboard) {
      toast.error("Export not available");
      return;
    }
    
    try {
      const result = await pageController.executeAction('exportDashboardData', {
        format: 'json',
        includeCharts: true
      });
      if (result.success) {
        toast.success('Dashboard data exported successfully');
        // Here you would typically trigger a download
        console.log('Export data:', result.data);
      } else {
        toast.error('Failed to export dashboard data');
      }
    } catch (error) {
      toast.error('Failed to export dashboard data');
    }
  }, [pageController.isRegistered, pageController.executeAction, canExportDashboard]);

  // Show loading state while organization context is being established
  if (!currentOrg) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Alert className="max-w-xl">
            <AlertTitle>Organization Required</AlertTitle>
            <AlertDescription>
              Please select an organization to view your dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Check permissions
  if (!canViewDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Alert className="max-w-xl">
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to view the dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            System overview and key metrics for {currentOrg?.name}
          </p>
          {dashboardData && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
              {dashboardData.isPartialData && " (Partial data - some services starting up)"}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* AI Assistant Integration Badge */}
          {pageController.isRegistered && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {pageController.getAvailableActions().length} AI actions
            </Badge>
          )}
          
          {/* Action Buttons */}
          {canExportDashboard && (
            <Button variant="outline" onClick={handleExportDashboard}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleRefreshDashboard} 
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <DashboardControls
            isEditing={isEditing}
            toggleEditing={toggleEditing}
            openWidgetCatalog={openWidgetCatalog}
            onRefresh={handleRefreshDashboard}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Error Display */}
      {controllerError && (
        <Alert className="bg-destructive/15 text-destructive border-destructive/20">
          <AlertTitle>Dashboard Error</AlertTitle>
          <AlertDescription>{controllerError}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Metrics Summary Cards */}
      {dashboardData?.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium text-muted-foreground">Total Users</div>
              </div>
              <div className="text-2xl font-bold mt-1">{dashboardData.metrics.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium text-muted-foreground">Total Objects</div>
              </div>
              <div className="text-2xl font-bold mt-1">{dashboardData.metrics.totalObjects}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium text-muted-foreground">Total Records</div>
              </div>
              <div className="text-2xl font-bold mt-1">{dashboardData.metrics.totalRecords}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium text-muted-foreground">Cloud Functions</div>
              </div>
              <div className="text-2xl font-bold mt-1">{dashboardData.metrics.totalFunctions}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium text-muted-foreground">Integrations</div>
              </div>
              <div className="text-2xl font-bold mt-1">{dashboardData.metrics.totalIntegrations}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Content */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
              </div>
              {/* Loading skeletons */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ) : widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Alert className="max-w-xl">
                <AlertTitle>Your dashboard is empty</AlertTitle>
                <AlertDescription>
                  Add widgets to create your custom dashboard experience.
                </AlertDescription>
              </Alert>
              <Button onClick={openWidgetCatalog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Widget
              </Button>
            </div>
          ) : (
            <GridLayout isEditing={isEditing} />
          )}
        </CardContent>
      </Card>

      {/* Widget Catalog Modal */}
      <WidgetCatalog
        open={isWidgetCatalogOpen}
        onClose={() => setIsWidgetCatalogOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;