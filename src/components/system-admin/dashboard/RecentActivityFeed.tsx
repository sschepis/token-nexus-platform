import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  RefreshCw,
  Rocket,
  Building2,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'deployment' | 'organization' | 'user' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error';
}

interface RecentActivityFeedProps {
  activities: ActivityItem[];
  onRefresh: () => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ 
  activities, 
  onRefresh 
}) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deployment':
        return <Rocket className="h-4 w-4" />;
      case 'organization':
        return <Building2 className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest system events and administrative actions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">System events will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Activity Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm leading-tight">
                          {activity.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      </div>
                      
                      {/* Status and Timestamp */}
                      <div className="flex flex-col items-end gap-1">
                        {activity.status && (
                          <Badge 
                            variant={getStatusBadgeVariant(activity.status)}
                            className="text-xs"
                          >
                            <div className="flex items-center gap-1">
                              {getStatusIcon(activity.status)}
                              {activity.status}
                            </div>
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(activity.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Activity Type Badge */}
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityFeed;