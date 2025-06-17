import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { GridLayout } from "@/components/dashboard/GridLayout";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { useDashboardStore } from "@/store/dashboardStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { WidgetCatalog } from "@/components/dashboard/WidgetCatalog";
import { usePageController } from "@/hooks/usePageController";
import { toast } from "sonner";

// Define static arrays outside component to prevent re-creation on every render
const DASHBOARD_PERMISSIONS = ['dashboard:read'];
const DASHBOARD_TAGS = ['dashboard', 'overview', 'metrics'];

const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { layouts, widgets, addWidget, saveDashboardLayout, loadDashboardLayout: storeLoadDashboardLayout } = useDashboardStore();
  const [isWidgetCatalogOpen, setIsWidgetCatalogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [controllerReady, setControllerReady] = useState(false);

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
    try {
      // Debug: Check available actions
      console.log('[DEBUG Dashboard] Available actions:', pageController.getAvailableActions());
      console.log('[DEBUG Dashboard] Page controller:', pageController.pageController);
      
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
      } else {
        // Handle specific error cases
        const errorMessage = result.error || 'Failed to load dashboard data';
        
        if (errorMessage.includes('Invalid function') || errorMessage.includes('getUserCount')) {
          console.warn('Dashboard: Cloud function registration issue detected');
          toast.warning('Some dashboard features are temporarily unavailable. Showing cached data.');
          // Set fallback data structure to prevent crashes
          setDashboardData({
            metrics: {
              userCount: 0,
              objectCount: 0,
              recordCount: 0,
              functionCount: 0,
              integrationCount: 0
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
      
      if (errorMessage.includes('Invalid function') || errorMessage.includes('getUserCount')) {
        console.warn('Dashboard: Parse Server cloud function not available');
        toast.warning('Dashboard services are starting up. Please wait a moment and refresh.');
        
        // Provide fallback data to prevent blank dashboard
        setDashboardData({
          metrics: {
            userCount: 0,
            objectCount: 0,
            recordCount: 0,
            functionCount: 0,
            integrationCount: 0
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
  }, [pageController.isRegistered, pageController.executeAction]); // Depend on stable properties instead of the whole object

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

  const refreshDashboard = useCallback(async () => {
    if (!pageController.isRegistered) return;
    
    try {
      await pageController.executeAction('refreshDashboard', {});
      await loadDashboardData();
      toast.success('Dashboard refreshed');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error('Failed to refresh dashboard');
    }
  }, [pageController.isRegistered, pageController.executeAction, loadDashboardData]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your {currentOrg?.name} organization
          </p>
          {dashboardData && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
        <DashboardControls
          isEditing={isEditing}
          toggleEditing={toggleEditing}
          openWidgetCatalog={openWidgetCatalog}
          onRefresh={refreshDashboard}
          isLoading={isLoading}
        />
      </div>

      {/* Dashboard Metrics Summary */}
      {dashboardData?.metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm font-medium text-muted-foreground">Total Users</div>
            <div className="text-2xl font-bold">{dashboardData.metrics.totalUsers}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm font-medium text-muted-foreground">Total Objects</div>
            <div className="text-2xl font-bold">{dashboardData.metrics.totalObjects}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm font-medium text-muted-foreground">Total Records</div>
            <div className="text-2xl font-bold">{dashboardData.metrics.totalRecords}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm font-medium text-muted-foreground">Cloud Functions</div>
            <div className="text-2xl font-bold">{dashboardData.metrics.totalFunctions}</div>
          </div>
          <div className="bg-card p-4 rounded-lg border">
            <div className="text-sm font-medium text-muted-foreground">Integrations</div>
            <div className="text-2xl font-bold">{dashboardData.metrics.totalIntegrations}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading dashboard...</p>
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
        <GridLayout
          isEditing={isEditing}
        />
      )}

      <WidgetCatalog
        open={isWidgetCatalogOpen}
        onClose={() => setIsWidgetCatalogOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;