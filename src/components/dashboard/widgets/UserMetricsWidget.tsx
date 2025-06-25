/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react';
import { Users, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { dashboardApi } from '@/services/api';

interface UserMetricsWidgetProps {
  id: string;
  config?: Record<string, any>;
}

interface UserMetrics {
  total: number;
  active: number;
  growth: number;
}

export const UserMetricsWidget: React.FC<UserMetricsWidgetProps> = ({ id, config }) => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [userStats, setUserStats] = useState<UserMetrics>({
    total: 0,
    active: 0,
    growth: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!currentOrg?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await dashboardApi.getDashboardMetrics({
        organizationId: currentOrg.id
      });

      if (response.success && response.data && response.data.metrics) {
        setUserStats({
          total: response.data.metrics.users.total,
          active: response.data.metrics.users.active,
          growth: response.data.metrics.users.growth
        });
      }
    } catch (error) {
      console.error('Error fetching user metrics:', error);
      setError('Failed to load user metrics');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg?.id]);
  
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);


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

  const isPositiveGrowth = userStats.growth >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold">{userStats.total}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 p-3 rounded-md">
          <div className="text-xs text-muted-foreground mb-1">Active</div>
          <div className="text-lg font-medium">{userStats.active}</div>
        </div>
        
        <div className="bg-muted/50 p-3 rounded-md">
          <div className="text-xs text-muted-foreground mb-1">Activity Rate</div>
          <div className="text-lg font-medium">
            {userStats.total > 0 ? Math.round((userStats.active / userStats.total) * 100) : 0}%
          </div>
        </div>
      </div>
      
      {userStats.growth !== 0 && (
        <div className={`flex items-center text-xs ${isPositiveGrowth ? 'text-green-500' : 'text-red-500'} mt-1`}>
          {isPositiveGrowth ? (
            <ArrowUpRight className="h-3 w-3 mr-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 mr-1" />
          )}
          <span>{Math.abs(userStats.growth)}% {isPositiveGrowth ? 'growth' : 'decline'} in activity</span>
        </div>
      )}
    </div>
  );
};
