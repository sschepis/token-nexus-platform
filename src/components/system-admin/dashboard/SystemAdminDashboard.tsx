import React, { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { SystemMetricsGrid } from './SystemMetricsGrid';
import { QuickActionsPanel } from './QuickActionsPanel';
import { RecentActivityFeed } from './RecentActivityFeed';
import { AdminToolsGrid } from './AdminToolsGrid';

interface SystemMetrics {
  platformHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    lastCheck: Date;
  };
  totalOrganizations: number;
  totalUsers: number;
  activeDeployments: number;
  systemResources: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'deployment' | 'organization' | 'user' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error';
}

export const SystemAdminDashboard: React.FC = () => {
  const { user, permissions } = useAppSelector(state => state.auth);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has system admin access
  const hasSystemAdminAccess = user?.isAdmin === true || (Array.isArray(permissions) && permissions.includes("system:admin"));

  useEffect(() => {
    if (!hasSystemAdminAccess) {
      setError('Access denied. System administrator privileges required.');
      setIsLoading(false);
      return;
    }

    loadDashboardData();
  }, [hasSystemAdminAccess]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load system metrics
      const metricsResponse = await fetch('/api/system-admin/metrics');
      if (!metricsResponse.ok) {
        throw new Error('Failed to load system metrics');
      }
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Load recent activity
      const activityResponse = await fetch('/api/system-admin/activity');
      if (!activityResponse.ok) {
        throw new Error('Failed to load recent activity');
      }
      const activityData = await activityResponse.json();
      setRecentActivity(activityData);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      
      // Set fallback data to prevent blank dashboard
      setMetrics({
        platformHealth: {
          status: 'warning',
          uptime: 'Unknown',
          lastCheck: new Date()
        },
        totalOrganizations: 0,
        totalUsers: 0,
        activeDeployments: 0,
        systemResources: {
          cpu: 0,
          memory: 0,
          storage: 0
        }
      });
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (!hasSystemAdminAccess) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            Access denied. You need system administrator privileges to view this dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading system dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">
            Platform overview and administrative tools
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* System Metrics Grid */}
      {metrics && (
        <SystemMetricsGrid 
          metrics={metrics} 
          onRefresh={handleRefresh}
        />
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel */}
        <div className="lg:col-span-1">
          <QuickActionsPanel />
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2">
          <RecentActivityFeed 
            activities={recentActivity}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      {/* Admin Tools Grid */}
      <AdminToolsGrid />
    </div>
  );
};

export default SystemAdminDashboard;