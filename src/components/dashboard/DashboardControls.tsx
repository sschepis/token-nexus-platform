
import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Grid, Save } from 'lucide-react';
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
}

export const DashboardControls: React.FC<DashboardControlsProps> = ({
  isEditing,
  toggleEditing,
  openWidgetCatalog
}) => {
  const { resetDashboard, widgets } = useDashboardStore();

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={isEditing ? "default" : "outline"}
        onClick={toggleEditing}
        className="flex items-center"
      >
        {isEditing ? (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Layout
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
