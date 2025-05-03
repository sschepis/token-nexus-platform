
import React from 'react';
import { 
  ActivityIcon, 
  UserPlus, 
  DollarSign, 
  Settings, 
  Check 
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'user' | 'token' | 'setting' | 'other';
  message: string;
  time: string;
}

interface ActivityFeedWidgetProps {
  id: string;
  config?: Record<string, any>;
}

export const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({ id, config }) => {
  // In a real app, this would fetch data from an API
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'user',
      message: 'New user Jane Smith joined the organization',
      time: '5 minutes ago'
    },
    {
      id: '2',
      type: 'token',
      message: 'Token ACME confirmed on Ethereum',
      time: '1 hour ago'
    },
    {
      id: '3',
      type: 'setting',
      message: 'Organization settings updated',
      time: '3 hours ago'
    },
    {
      id: '4',
      type: 'token',
      message: 'New token TEST created on Polygon',
      time: 'Yesterday'
    },
    {
      id: '5',
      type: 'other',
      message: 'System maintenance completed',
      time: '2 days ago'
    },
  ];

  const getIcon = (type: string) => {
    switch(type) {
      case 'user':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'token':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'setting':
        return <Settings className="h-4 w-4 text-amber-500" />;
      default:
        return <Check className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-2">
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <ActivityIcon className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        activities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex items-start p-3 rounded-md hover:bg-muted/70"
          >
            <div className="mr-3 mt-0.5">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                {getIcon(activity.type)}
              </div>
            </div>
            <div>
              <p className="text-sm">{activity.message}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
