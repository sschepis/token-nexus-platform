import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  User, 
  Settings, 
  Package, 
  Shield, 
  Loader2,
  Clock,
  FileText,
  UserPlus,
  UserMinus,
  Key,
  Building
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { dashboardApi } from '@/services/api';

interface ActivityFeedWidgetProps {
  id: string;
  config?: Record<string, unknown>;
}

interface ActivityItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  actor: {
    id: string;
    email: string;
    name: string;
  } | null;
  details: Record<string, unknown>;
  timestamp: string;
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({ id, config }) => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchActivities = useCallback(async () => {
    if (!currentOrg?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await dashboardApi.getDashboardActivity({
        organizationId: currentOrg.id,
        limit: 20
      });

      if (response.success && response.data) {
        setActivities(response.data);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setError('Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    fetchActivities();
  }, [currentOrg?.id, fetchActivities]);

  const getActivityIcon = (action: string, targetType: string) => {
    // Icon mapping based on action and target type
    if (action.includes('user.created')) return <UserPlus className="h-4 w-4" />;
    if (action.includes('user.deleted')) return <UserMinus className="h-4 w-4" />;
    if (action.includes('user.login')) return <Key className="h-4 w-4" />;
    if (action.includes('token')) return <Package className="h-4 w-4" />;
    if (action.includes('org')) return <Building className="h-4 w-4" />;
    if (action.includes('settings')) return <Settings className="h-4 w-4" />;
    if (action.includes('app')) return <Package className="h-4 w-4" />;
    
    switch (targetType) {
      case 'User':
        return <User className="h-4 w-4" />;
      case 'Organization':
        return <Shield className="h-4 w-4" />;
      case 'Token':
        return <Package className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const actor = activity.actor?.name || activity.actor?.email || 'System';
    const action = activity.action.replace(/_/g, ' ').replace(/\./g, ' ');
    
    // Generate human-readable descriptions
    switch (activity.action) {
      case 'user.login':
        return `${actor} logged in`;
      case 'user.created':
        return `${actor} created a new user`;
      case 'user.updated':
        return `${actor} updated user information`;
      case 'token.created':
        return `${actor} created a new token`;
      case 'app.installed':
        return `${actor} installed an app`;
      case 'organization.updated':
        return `${actor} updated organization settings`;
      default:
        return `${actor} performed ${action}`;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No recent activity
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 pr-4">
        {activities.map((activity) => (
          <Card key={activity.id} className="p-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  {getActivityIcon(activity.action, activity.targetType)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {getActivityDescription(activity)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.targetType}
                  </Badge>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {getRelativeTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
