import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  Star,
  Activity,
  Calendar,
  Package,
  Globe,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye
} from 'lucide-react';

interface AppDefinitionForMarketplace {
  id: string;
  objectId: string;
  name: string;
  description: string;
  publisherName: string;
  category: string;
  iconUrl?: string;
  tags: string[];
  overallRating: number;
  reviewCount: number;
  isFeatured: boolean;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AppStoreStats {
  totalApps: number;
  publishedApps: number;
  pendingReviews: number;
  totalInstallations: number;
  activeUsers: number;
  averageRating: number;
  topCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'app_published' | 'app_installed' | 'review_submitted' | 'app_updated';
    appName: string;
    timestamp: string;
    details: string;
  }>;
}

interface AppAnalytics {
  appId: string;
  appName: string;
  category: string;
  totalInstallations: number;
  activeInstallations: number;
  installationTrend: Array<{
    date: string;
    installations: number;
    uninstallations: number;
  }>;
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
  };
  performanceMetrics: {
    averageLoadTime: number;
    errorRate: number;
    crashRate: number;
    apiResponseTime: number;
  };
  ratings: {
    average: number;
    total: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

interface AppAnalyticsDashboardProps {
  storeStats: AppStoreStats | null;
  appDefinitions: AppDefinitionForMarketplace[];
}

export function AppAnalyticsDashboard({ storeStats, appDefinitions }: AppAnalyticsDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [appAnalytics, setAppAnalytics] = useState<AppAnalytics[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock analytics data - in real implementation, this would come from cloud functions
  const mockAppAnalytics: AppAnalytics[] = [
    {
      appId: '1',
      appName: 'Budget Tracker Pro',
      category: 'Finance',
      totalInstallations: 245,
      activeInstallations: 189,
      installationTrend: [
        { date: '2024-11-01', installations: 12, uninstallations: 2 },
        { date: '2024-11-02', installations: 15, uninstallations: 1 },
        { date: '2024-11-03', installations: 8, uninstallations: 3 },
        { date: '2024-11-04', installations: 22, uninstallations: 1 },
        { date: '2024-11-05', installations: 18, uninstallations: 4 },
      ],
      userEngagement: {
        dailyActiveUsers: 156,
        weeklyActiveUsers: 189,
        monthlyActiveUsers: 245,
        averageSessionDuration: 12.5
      },
      performanceMetrics: {
        averageLoadTime: 2.3,
        errorRate: 0.8,
        crashRate: 0.2,
        apiResponseTime: 145
      },
      ratings: {
        average: 4.6,
        total: 89,
        distribution: { 1: 2, 2: 3, 3: 8, 4: 25, 5: 51 }
      }
    },
    {
      appId: '2',
      appName: 'Team Chat',
      category: 'Communication',
      totalInstallations: 567,
      activeInstallations: 423,
      installationTrend: [
        { date: '2024-11-01', installations: 25, uninstallations: 5 },
        { date: '2024-11-02', installations: 32, uninstallations: 3 },
        { date: '2024-11-03', installations: 18, uninstallations: 7 },
        { date: '2024-11-04', installations: 41, uninstallations: 2 },
        { date: '2024-11-05', installations: 28, uninstallations: 6 },
      ],
      userEngagement: {
        dailyActiveUsers: 398,
        weeklyActiveUsers: 423,
        monthlyActiveUsers: 567,
        averageSessionDuration: 28.7
      },
      performanceMetrics: {
        averageLoadTime: 1.8,
        errorRate: 1.2,
        crashRate: 0.1,
        apiResponseTime: 98
      },
      ratings: {
        average: 4.3,
        total: 156,
        distribution: { 1: 5, 2: 8, 3: 15, 4: 67, 5: 61 }
      }
    }
  ];

  useEffect(() => {
    setAppAnalytics(mockAppAnalytics);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return `${hours}h ${mins}m`;
    }
    return `${Math.round(minutes)}m`;
  };

  const getPerformanceColor = (value: number, metric: string) => {
    switch (metric) {
      case 'loadTime':
        return value <= 2 ? 'text-green-600' : value <= 5 ? 'text-yellow-600' : 'text-red-600';
      case 'errorRate':
        return value <= 1 ? 'text-green-600' : value <= 3 ? 'text-yellow-600' : 'text-red-600';
      case 'crashRate':
        return value <= 0.5 ? 'text-green-600' : value <= 1 ? 'text-yellow-600' : 'text-red-600';
      case 'apiResponse':
        return value <= 200 ? 'text-green-600' : value <= 500 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredAnalytics = selectedApp === 'all' 
    ? appAnalytics 
    : appAnalytics.filter(app => app.appId === selectedApp);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">App Store Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Performance metrics and insights for your app marketplace
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedApp} onValueChange={setSelectedApp}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select App" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {appAnalytics.map((app) => (
                <SelectItem key={app.appId} value={app.appId}>
                  {app.appName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      {storeStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Installs</p>
                  <p className="text-2xl font-bold">{formatNumber(storeStats.totalInstallations)}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% from last month
                  </p>
                </div>
                <Download className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{formatNumber(storeStats.activeUsers)}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8% from last month
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                  <p className="text-2xl font-bold">{storeStats.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-yellow-600 flex items-center mt-1">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Based on 342 reviews
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold">$2,847</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +15% from last month
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* App-specific Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAnalytics.map((app) => (
          <div key={app.appId} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {app.appName}
                </CardTitle>
                <CardDescription>
                  {app.category} • {formatNumber(app.totalInstallations)} total installs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Installation Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Installs</p>
                    <p className="text-xl font-bold">{formatNumber(app.activeInstallations)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                    <p className="text-xl font-bold">
                      {((app.activeInstallations / app.totalInstallations) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* User Engagement */}
                <div>
                  <h4 className="font-medium mb-2">User Engagement</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Active:</span>
                      <span>{formatNumber(app.userEngagement.dailyActiveUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weekly Active:</span>
                      <span>{formatNumber(app.userEngagement.weeklyActiveUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Active:</span>
                      <span>{formatNumber(app.userEngagement.monthlyActiveUsers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Session:</span>
                      <span>{formatDuration(app.userEngagement.averageSessionDuration)}</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h4 className="font-medium mb-2">Performance</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Load Time:</span>
                      <span className={getPerformanceColor(app.performanceMetrics.averageLoadTime, 'loadTime')}>
                        {app.performanceMetrics.averageLoadTime}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Error Rate:</span>
                      <span className={getPerformanceColor(app.performanceMetrics.errorRate, 'errorRate')}>
                        {app.performanceMetrics.errorRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crash Rate:</span>
                      <span className={getPerformanceColor(app.performanceMetrics.crashRate, 'crashRate')}>
                        {app.performanceMetrics.crashRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API Response:</span>
                      <span className={getPerformanceColor(app.performanceMetrics.apiResponseTime, 'apiResponse')}>
                        {app.performanceMetrics.apiResponseTime}ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ratings */}
                <div>
                  <h4 className="font-medium mb-2">Ratings & Reviews</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{app.ratings.average.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">
                        ({app.ratings.total} reviews)
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2 text-xs">
                        <span className="w-3">{rating}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-yellow-500 h-1.5 rounded-full" 
                            style={{ 
                              width: `${(app.ratings.distribution[rating as keyof typeof app.ratings.distribution] / app.ratings.total) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="w-6 text-right">
                          {app.ratings.distribution[rating as keyof typeof app.ratings.distribution]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Installation Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Installation Trends
          </CardTitle>
          <CardDescription>
            Daily installation and uninstallation patterns over the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredAnalytics.map((app) => (
              <div key={app.appId} className="space-y-2">
                <h4 className="font-medium">{app.appName}</h4>
                <div className="grid grid-cols-5 gap-2">
                  {app.installationTrend.map((day, index) => (
                    <div key={index} className="text-center p-2 border rounded">
                      <p className="text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm font-medium text-green-600">+{day.installations}</p>
                      <p className="text-xs text-red-600">-{day.uninstallations}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}