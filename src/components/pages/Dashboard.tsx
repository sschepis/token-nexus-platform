import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import Parse from "parse";
import { GridLayout } from "@/components/dashboard/GridLayout";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { useDashboardStore } from "@/store/dashboardStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { WidgetCatalog } from "@/components/dashboard/WidgetCatalog";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { layouts, widgets, setLayouts, setWidgets, addWidget } = useDashboardStore();
  const [isWidgetCatalogOpen, setIsWidgetCatalogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);


  const loadDashboardConfig = useCallback(async () => {
    if (!currentOrg?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await Parse.Cloud.run('getDashboardConfig', {
        // organizationId removed - will be injected by server middleware
      });

      if (result.success && result.config) {
        setLayouts(result.config.layouts);
        setWidgets(result.config.widgets);
      }
    } catch (error) {
      console.error('Error loading dashboard config:', error);
      toast.error('Failed to load dashboard configuration');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg?.id]); // Removed setLayouts, setWidgets from dependencies to prevent infinite loop

  // Load dashboard config on mount or org change
  useEffect(() => {
    loadDashboardConfig();
  }, [currentOrg?.id]); // Changed to depend directly on currentOrg?.id instead of loadDashboardConfig


  const saveDashboardConfig = async () => {
    if (!currentOrg?.id) {
      toast.error('No organization selected');
      return;
    }

    setIsSaving(true);
    try {
      const result = await Parse.Cloud.run('saveDashboardConfig', {
        layouts,
        widgets
        // organizationId removed - will be injected by server middleware
      });

      if (result.success) {
        toast.success('Dashboard configuration saved');
      }
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      toast.error('Failed to save dashboard configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEditing = async () => {
    if (isEditing) {
      // Save when exiting edit mode
      await saveDashboardConfig();
    }
    setIsEditing(!isEditing);
  };

  const openWidgetCatalog = () => {
    setIsWidgetCatalogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Alert className="max-w-xl">
          <AlertTitle>No Organization Selected</AlertTitle>
          <AlertDescription>
            Please select an organization to view your dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName}</h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your {currentOrg?.name} organization
          </p>
        </div>
        <DashboardControls 
          isEditing={isEditing}
          toggleEditing={toggleEditing}
          openWidgetCatalog={openWidgetCatalog}
          isSaving={isSaving}
        />
      </div>

      {widgets.length === 0 ? (
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

export default Dashboard;
