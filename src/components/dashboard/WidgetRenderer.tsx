
import React from 'react';
import { Widget, useDashboardStore } from '@/store/dashboardStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Settings } from 'lucide-react';
import { TokenStatsWidget } from './widgets/TokenStatsWidget';
import { RecentTokensWidget } from './widgets/RecentTokensWidget';
import { UserMetricsWidget } from './widgets/UserMetricsWidget';
import { ActivityFeedWidget } from './widgets/ActivityFeedWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { ChartWidget } from './widgets/ChartWidget';

interface WidgetRendererProps {
  widget: Widget;
  isEditing: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ widget, isEditing }) => {
  const { removeWidget } = useDashboardStore();
  const [showSettings, setShowSettings] = React.useState(false);

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'tokenStats':
        return <TokenStatsWidget id={widget.id} config={widget.config} />;
      case 'recentTokens':
        return <RecentTokensWidget id={widget.id} config={widget.config} />;
      case 'userMetrics':
        return <UserMetricsWidget id={widget.id} config={widget.config} />;
      case 'activityFeed':
        return <ActivityFeedWidget id={widget.id} config={widget.config} />;
      case 'quickActions':
        return <QuickActionsWidget id={widget.id} config={widget.config} />;
      case 'chartWidget':
        return <ChartWidget id={widget.id} config={widget.config} />;
      default:
        return <div>Unknown widget type: {widget.type}</div>;
    }
  };

  return (
    <Card className="h-full overflow-hidden border bg-card text-card-foreground shadow hover:shadow-md transition-shadow duration-200">
      <CardHeader className="px-4 py-3 flex flex-row items-center space-x-0 justify-between bg-muted/50">
        <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
        {isEditing && (
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="sr-only">Settings</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => removeWidget(widget.id)}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-48px)] overflow-auto">
        {renderWidgetContent()}
      </CardContent>
    </Card>
  );
};
