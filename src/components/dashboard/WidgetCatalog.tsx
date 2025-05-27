
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WidgetType, useDashboardStore } from '@/store/dashboardStore';
import { DollarSign, Users, Clock, RefreshCcw, BarChart, ListTodo, AppWindow } from 'lucide-react';

interface WidgetOption {
  type: WidgetType;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface WidgetCatalogProps {
  open: boolean;
  onClose: () => void;
}

export const WidgetCatalog: React.FC<WidgetCatalogProps> = ({ open, onClose }) => {
  const { addWidget } = useDashboardStore();

  const widgetOptions: WidgetOption[] = [
    {
      type: 'tokenStats',
      title: 'Token Statistics',
      description: 'Display token counts and metrics',
      icon: <DollarSign className="h-8 w-8 text-primary" />
    },
    {
      type: 'recentTokens',
      title: 'Recent Tokens',
      description: 'Show recently created tokens',
      icon: <Clock className="h-8 w-8 text-primary" />
    },
    {
      type: 'userMetrics',
      title: 'User Metrics',
      description: 'Display user-related statistics',
      icon: <Users className="h-8 w-8 text-primary" />
    },
    {
      type: 'activityFeed',
      title: 'Activity Feed',
      description: 'Recent activity and notifications',
      icon: <RefreshCcw className="h-8 w-8 text-primary" />
    },
    {
      type: 'quickActions',
      title: 'Quick Actions',
      description: 'Shortcuts to common tasks',
      icon: <ListTodo className="h-8 w-8 text-primary" />
    },
    {
      type: 'chartWidget',
      title: 'Chart',
      description: 'Customizable data visualization',
      icon: <BarChart className="h-8 w-8 text-primary" />
    },
    {
      type: 'installedApps',
      title: 'My Applications',
      description: 'View and launch your installed applications',
      icon: <AppWindow className="h-8 w-8 text-primary" />
    }
  ];

  const handleAddWidget = (widgetType: WidgetType) => {
    addWidget(widgetType);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          {widgetOptions.map((widget) => (
            <Button
              key={widget.type}
              variant="outline"
              className="h-auto flex flex-col items-center justify-center p-6 space-y-3 hover:bg-accent hover:text-accent-foreground"
              onClick={() => handleAddWidget(widget.type)}
            >
              <div className="p-2 rounded-full bg-primary/10">{widget.icon}</div>
              <div className="font-medium">{widget.title}</div>
              <p className="text-xs text-muted-foreground text-center">
                {widget.description}
              </p>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
