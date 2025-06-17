
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Grid, Save, Loader2, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface DashboardControlsProps {
  isEditing: boolean;
  toggleEditing: () => void;
  openWidgetCatalog: () => void;
  onRefresh?: () => void;
  isSaving?: boolean;
  isLoading?: boolean;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  isEditing,
  toggleEditing,
  openWidgetCatalog,
  onRefresh,
  isSaving = false,
  isLoading = false
}) => {
  const { resetDashboard, widgets } = useDashboardStore();

  return (
    <div className="flex items-center space-x-2">
      {/* Refresh Button */}
      {onRefresh && (
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading || isSaving}
          className="flex items-center"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      )}

      <Button
        variant={isEditing ? "default" : "outline"}
        onClick={toggleEditing}
        className="flex items-center"
        disabled={isSaving || isLoading}
      >
        {isEditing ? (
          <>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Layout'}
          </>
        ) : (
          <>
            <Grid className="mr-2 h-4 w-4" />
            Edit Layout
          </>
        )}
      </Button>
      
      {isEditing && (
        <>
          <Button onClick={openWidgetCatalog} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Widget
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isLoading}>Options</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Dashboard Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={resetDashboard}
                className="text-destructive focus:text-destructive"
                disabled={widgets.length === 0 || isLoading}
              >
                Reset Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
};
