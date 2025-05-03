
import React from 'react';
import { Users, ArrowUpRight } from 'lucide-react';

interface UserMetricsWidgetProps {
  id: string;
  config?: Record<string, any>;
}

export const UserMetricsWidget: React.FC<UserMetricsWidgetProps> = ({ id, config }) => {
  // In a real app, this would fetch data from an API
  const userStats = {
    totalUsers: 3,
    activeUsers: 2,
    newUsers: 1,
    growth: 12
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold">{userStats.totalUsers}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 p-3 rounded-md">
          <div className="text-xs text-muted-foreground mb-1">Active</div>
          <div className="text-lg font-medium">{userStats.activeUsers}</div>
        </div>
        
        <div className="bg-muted/50 p-3 rounded-md">
          <div className="text-xs text-muted-foreground mb-1">New</div>
          <div className="text-lg font-medium">{userStats.newUsers}</div>
        </div>
      </div>
      
      <div className="flex items-center text-xs text-green-500 mt-1">
        <ArrowUpRight className="h-3 w-3 mr-1" />
        <span>{userStats.growth}% growth from last month</span>
      </div>
    </div>
  );
};
