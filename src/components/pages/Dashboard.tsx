import React, { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/store/hooks";
import { dashboardApi } from "@/services/api";
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
    if (!currentOrg?.id || !user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await dashboardApi.getDashboardLayout(user.id, currentOrg.id);

      if (response.success && response.data) {
        setLayouts(response.data.layouts);
        setWidgets(response.data.widgets);
      }
    } catch (error) {
      console.error('Error loading dashboard config:', error);
      toast.error('Failed to load dashboard configuration');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg?.id, user?.id, setLayouts, setWidgets]);

  // Load dashboard config on mount or org change
  useEffect(() => {
    loadDashboardConfig();
  }, [loadDashboardConfig]);

  const saveDashboardConfig = async () => {
    if (!currentOrg?.id || !user?.id) {
      toast.error('No organization or user selected');
      return;
    }

    setIsSaving(true);
    try {
      const response = await dashboardApi.saveDashboardLayout({
        userId: user.id,
        orgId: currentOrg.id,
        layouts,
        widgets
      });

      if (response.success) {
        toast.success('Dashboard configuration saved');
      } else {
        toast.error(response.error || 'Failed to save dashboard configuration');
      }
    } catch (error) {
      console.error('Error saving dashboard config:', error);
      toast.error('Failed to save dashboard configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEditMode = () => {
    if (isEditing) {
      saveDashboardConfig();
    }
    setIsEditing(!isEditing);
  };

  const handleAddWidget = () => {
    setIsWidgetCatalogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <Alert>
        <AlertTitle>No Organization Selected</AlertTitle>
        <AlertDescription>
          Please select an organization to view your dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button onClick={handleAddWidget} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Widget
            </Button>
          )}
          <Button 
            onClick={toggleEditMode} 
            variant={isEditing ? "default" : "outline"}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEditing ? "Save Layout" : "Edit Layout"
            )}
          </Button>
        </div>
      </div>

      <DashboardControls 
        isEditing={isEditing}
        isSaving={isSaving}
        toggleEditing={toggleEditMode}
        openWidgetCatalog={handleAddWidget}
      />

      <GridLayout 
        isEditing={isEditing}
      />

      <WidgetCatalog
        open={isWidgetCatalogOpen}
        onClose={() => setIsWidgetCatalogOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
