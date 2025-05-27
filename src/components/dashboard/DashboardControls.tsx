
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Grid, Save, Loader2 } from 'lucide-react';
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
  isSaving?: boolean;
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  isEditing,
  toggleEditing,
  openWidgetCatalog,
  isSaving = false
}) => {
  const { resetDashboard, widgets } = useDashboardStore();

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={isEditing ? "default" : "outline"}
        onClick={toggleEditing}
        className="flex items-center"
        disabled={isSaving}
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
          <Button onClick={openWidgetCatalog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Widget
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Options</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Dashboard Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={resetDashboard}
                className="text-destructive focus:text-destructive"
                disabled={widgets.length === 0}
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
