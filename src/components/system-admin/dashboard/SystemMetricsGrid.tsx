import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Building2, 
  Users, 
  Server, 
  Cpu, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

interface SystemMetricsGridProps {
  metrics: SystemMetrics;
  onRefresh: () => void;
}

export const SystemMetricsGrid: React.FC<SystemMetricsGridProps> = ({ metrics, onRefresh }) => {
  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatResourcePercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">System Overview</h2>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Platform Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            {getHealthStatusIcon(metrics.platformHealth.status)}
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge 
                variant="secondary" 
                className={`${getHealthStatusColor(metrics.platformHealth.status)} text-white`}
              >
                {metrics.platformHealth.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Uptime: {metrics.platformHealth.uptime}
            </p>
            <p className="text-xs text-muted-foreground">
              Last check: {new Date(metrics.platformHealth.lastCheck).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        {/* Total Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              Total organizations
            </p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Total users across all orgs
            </p>
          </CardContent>
        </Card>

        {/* Active Deployments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deployments</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeDeployments}</div>
            <p className="text-xs text-muted-foreground">
              Active deployments
            </p>
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>CPU:</span>
                <span>{formatResourcePercentage(metrics.systemResources.cpu)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Memory:</span>
                <span>{formatResourcePercentage(metrics.systemResources.memory)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Storage:</span>
                <span>{formatResourcePercentage(metrics.systemResources.storage)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemMetricsGrid;