import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import Parse from 'parse';
import {
  Package,
  Upload,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Download,
  Clock,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
  MoreVertical,
  Send,
  Archive,
  Code,
  FileText,
  Globe,
  Mail,
  Shield,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  History,
  BarChart3,
  TrendingUp,
  Users,
  Star,
  Activity
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppReviewQueue } from './AppReviewQueue';
import { AppAnalyticsDashboard } from './AppAnalyticsDashboard';
import { AppDefinitionManager } from './AppDefinitionManager';

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

interface AppVersionForMarketplace {
  id: string;
  objectId: string;
  versionString: string;
  bundleUrl?: string;
  changelog?: string;
  releaseNotes?: string;
  status: string;
  appDefinition: {
    objectId: string;
    __type: string;
    className: string;
  };
  submittedBy?: {
    objectId: string;
    username: string;
    email: string;
  };
  reviewedBy?: {
    objectId: string;
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  minPlatformVersion?: string;
  dependencies?: string[];
  publishedTimestamp?: string;
  reviewTimestamp?: string;
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

export default function AppStoreManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [appDefinitions, setAppDefinitions] = useState<AppDefinitionForMarketplace[]>([]);
  const [pendingVersions, setPendingVersions] = useState<AppVersionForMarketplace[]>([]);
  const [storeStats, setStoreStats] = useState<AppStoreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<AppDefinitionForMarketplace | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const categories = [
    { value: 'finance', label: 'Finance' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'communication', label: 'Communication' },
    { value: 'integration', label: 'Integration' },
    { value: 'security', label: 'Security' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'other', label: 'Other' }
  ];

  const fetchAppDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      // Use the Phase 1 API bridge function
      const result = await Parse.Cloud.run('listAppsForAdmin', {
        page: 1,
        limit: 100,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        searchQuery: searchQuery || undefined
      });

      if (result.success) {
        setAppDefinitions(result.bundles || []);
      } else {
        // Fallback to direct fetchAppDefinitions if listAppsForAdmin doesn't exist
        const apps = await Parse.Cloud.run('fetchAppDefinitions', {
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          search: searchQuery || undefined
        });
        setAppDefinitions(apps);
      }
    } catch (error) {
      console.error('Error fetching app definitions:', error);
      toast.error('Failed to fetch app definitions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery]);

  const fetchPendingVersions = useCallback(async () => {
    try {
      // Get all app versions that are pending review
      const result = await Parse.Cloud.run('getPendingReviews', {
        page: 1,
        limit: 50
      });

      if (result.success) {
        setPendingVersions(result.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching pending versions:', error);
    }
  }, []);

  const fetchStoreStats = useCallback(async () => {
    try {
      // Mock stats for now - in real implementation, this would be a cloud function
      const mockStats: AppStoreStats = {
        totalApps: appDefinitions.length,
        publishedApps: appDefinitions.filter(app => app.status === 'active').length,
        pendingReviews: pendingVersions.length,
        totalInstallations: 1247,
        activeUsers: 89,
        averageRating: 4.2,
        topCategories: [
          { category: 'Productivity', count: 15, percentage: 35 },
          { category: 'Finance', count: 12, percentage: 28 },
          { category: 'Communication', count: 8, percentage: 19 },
          { category: 'Integration', count: 5, percentage: 12 },
          { category: 'Other', count: 3, percentage: 6 }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'app_published',
            appName: 'Budget Tracker Pro',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            details: 'Version 2.1.0 published'
          },
          {
            id: '2',
            type: 'app_installed',
            appName: 'Team Chat',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            details: 'Installed by Acme Corp'
          },
          {
            id: '3',
            type: 'review_submitted',
            appName: 'Analytics Dashboard',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            details: 'Version 1.3.0 submitted for review'
          }
        ]
      };
      setStoreStats(mockStats);
    } catch (error) {
      console.error('Error fetching store stats:', error);
    }
  }, [appDefinitions.length, pendingVersions.length]);

  useEffect(() => {
    fetchAppDefinitions();
  }, [fetchAppDefinitions]);

  useEffect(() => {
    fetchPendingVersions();
  }, [fetchPendingVersions]);

  useEffect(() => {
    if (appDefinitions.length > 0) {
      fetchStoreStats();
    }
  }, [fetchStoreStats, appDefinitions.length]);

  const handleApproveVersion = async (versionId: string) => {
    try {
      const result = await Parse.Cloud.run('approveAppVersion', { versionId });
      if (result.success) {
        toast.success('App version approved successfully');
        fetchPendingVersions();
        fetchAppDefinitions();
      }
    } catch (error) {
      toast.error('Failed to approve app version');
    }
  };

  const handleRejectVersion = async (versionId: string, reason: string) => {
    try {
      const result = await Parse.Cloud.run('rejectAppVersion', { versionId, reason });
      if (result.success) {
        toast.success('App version rejected');
        fetchPendingVersions();
        fetchAppDefinitions();
      }
    } catch (error) {
      toast.error('Failed to reject app version');
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    try {
      const result = await Parse.Cloud.run('publishAppVersion', { versionId });
      if (result.success) {
        toast.success('App version published successfully');
        fetchAppDefinitions();
      }
    } catch (error) {
      toast.error('Failed to publish app version');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'outline' as const, icon: Edit, color: 'text-gray-600' },
      pending_review: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      in_review: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      published: { variant: 'default' as const, icon: Package, color: 'text-blue-600' },
      active: { variant: 'default' as const, icon: Package, color: 'text-green-600' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                App Store Management
              </CardTitle>
              <CardDescription>
                Manage applications, reviews, analytics, and marketplace operations
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">
                <BarChart3 className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="apps">
                <Package className="mr-2 h-4 w-4" />
                App Definitions
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <Clock className="mr-2 h-4 w-4" />
                Pending Reviews
                {pendingVersions.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingVersions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="space-y-6">
                {/* Stats Cards */}
                {storeStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Apps</p>
                            <p className="text-2xl font-bold">{storeStats.totalApps}</p>
                          </div>
                          <Package className="h-8 w-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Published</p>
                            <p className="text-2xl font-bold">{storeStats.publishedApps}</p>
                          </div>
                          <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                            <p className="text-2xl font-bold">{storeStats.pendingReviews}</p>
                          </div>
                          <Clock className="h-8 w-8 text-yellow-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Installs</p>
                            <p className="text-2xl font-bold">{storeStats.totalInstallations}</p>
                          </div>
                          <Download className="h-8 w-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {storeStats?.recentActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                            <div className="flex-shrink-0 mt-1">
                              {activity.type === 'app_published' && <Package className="h-4 w-4 text-green-600" />}
                              {activity.type === 'app_installed' && <Download className="h-4 w-4 text-blue-600" />}
                              {activity.type === 'review_submitted' && <Clock className="h-4 w-4 text-yellow-600" />}
                              {activity.type === 'app_updated' && <Edit className="h-4 w-4 text-purple-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{activity.appName}</p>
                              <p className="text-xs text-muted-foreground">{activity.details}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Top Categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {storeStats?.topCategories.map((category) => (
                          <div key={category.category} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{category.category}</span>
                              <span>{category.count} apps ({category.percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${category.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* App Definitions Tab */}
            <TabsContent value="apps">
              <AppDefinitionManager 
                appDefinitions={appDefinitions}
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                categories={categories}
                onRefresh={fetchAppDefinitions}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
              />
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <AppReviewQueue 
                pendingVersions={pendingVersions}
                onApprove={handleApproveVersion}
                onReject={handleRejectVersion}
                onPublish={handlePublishVersion}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <AppAnalyticsDashboard 
                storeStats={storeStats}
                appDefinitions={appDefinitions}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}