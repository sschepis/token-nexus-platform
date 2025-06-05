import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { GridLayout } from "@/components/dashboard/GridLayout";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { useDashboardStore } from "@/store/dashboardStore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { WidgetCatalog } from "@/components/dashboard/WidgetCatalog";

const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org); // Note: currentOrg is from orgSlice, not authSlice.
  const { layouts, widgets, addWidget, saveDashboardLayout, loadDashboardLayout } = useDashboardStore(); // Added save/load actions
  const [isWidgetCatalogOpen, setIsWidgetCatalogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load user dashboard config on component mount
  useEffect(() => {
    if (user && currentOrg) {
      loadDashboardLayout(); // Load layout based on current user and org
    }
  }, [user, currentOrg, loadDashboardLayout]); // Dependencies on user, currentOrg, loadDashboardLayout

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Save layouts to backend when exiting edit mode
      saveDashboardLayout();
    }
  };

  const openWidgetCatalog = () => {
    setIsWidgetCatalogOpen(true);
  };

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

export default DashboardPage;