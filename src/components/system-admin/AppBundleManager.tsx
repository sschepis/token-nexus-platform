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
  History
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AppBundle {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'published';
  currentVersion: string;
  publishedVersion?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  developer?: {
    id: string;
    email: string;
    name: string;
  };
  stats: {
    versionCount: number;
    installCount: number;
  };
}

interface AppVersion {
  id: string;
  version: string;
  status: 'pending_review' | 'in_review' | 'approved' | 'rejected' | 'published';
  bundleUrl?: string;
  releaseNotes?: string;
  submittedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

interface AppReview {
  id: string;
  status: string;
  version: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    id: string;
    email: string;
  };
  submissionNotes?: string;
  reviewComments?: string;
  rejectionReason?: string;
}

interface PendingReview {
  id: string;
  appBundle: {
    id: string;
    name: string;
    category: string;
    icon?: string;
  };
  version: string;
  submittedBy: {
    id: string;
    email: string;
    name: string;
  };
  submittedAt: string;
  submissionNotes?: string;
}

interface AppBundleDetails {
  bundle: {
    id: string;
    name: string;
    description: string;
    category: string;
    status: string;
    currentVersion: string;
    publishedVersion?: string;
    permissions?: string[];
    configuration?: Record<string, unknown>;
    screenshots?: string[];
    icon?: string;
    supportEmail?: string;
    website?: string;
    documentation?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    developer?: {
      id: string;
      email: string;
      name: string;
    };
  };
  versions: AppVersion[];
  reviews: AppReview[];
}

interface ListAppsParams {
  page: number;
  limit: number;
  status?: string;
  category?: string;
  searchQuery?: string;
}

export default function AppBundleManager() {
  const [apps, setApps] = useState<AppBundle[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AppBundle | null>(null);
  const [appDetails, setAppDetails] = useState<AppBundleDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('apps');
  const [reviewComments, setReviewComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<AppVersion | null>(null);
  
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    category: 'productivity',
    version: '1.0.0',
    bundleUrl: '',
    permissions: [] as string[],
    configuration: {},
    icon: '',
    supportEmail: '',
    website: '',
    documentation: '',
    releaseNotes: ''
  });

  const categories = [
    { value: 'productivity', label: 'Productivity' },
    { value: 'communication', label: 'Communication' },
    { value: 'finance', label: 'Finance' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'development', label: 'Development' },
    { value: 'security', label: 'Security' },
    { value: 'integration', label: 'Integration' },
    { value: 'other', label: 'Other' }
  ];

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListAppsParams = {
        page: currentPage,
        limit: 20
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (searchQuery) params.searchQuery = searchQuery;

      const result = await Parse.Cloud.run('listAppsForAdmin', params);

      if (result.success) {
        setApps(result.bundles);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Error fetching apps:', error);
      toast.error('Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, searchQuery, currentPage]);

  const fetchPendingReviews = useCallback(async () => {
    try {
      const result = await Parse.Cloud.run('getPendingReviews', {
        page: 1,
        limit: 50
      });

      if (result.success) {
        setPendingReviews(result.reviews);
      }
    } catch (error) {
      console.error('Error fetching pending reviews:', error);
    }
  }, []);

  const fetchAppDetails = async (bundleId: string) => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('getAppBundleDetails', { bundleId });
      if (result.success) {
        setAppDetails(result);
        setIsDetailOpen(true);
      }
    } catch (error) {
      toast.error('Failed to fetch app details');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'apps') {
      fetchApps();
    } else if (activeTab === 'reviews') {
      fetchPendingReviews();
    }
  }, [activeTab, fetchApps, fetchPendingReviews]);

  const handleCreateApp = async () => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('createOrUpdateAppBundle', createFormData);
      if (result.success) {
        toast.success(result.message);
        setIsCreateOpen(false);
        setCreateFormData({
          name: '',
          description: '',
          category: 'productivity',
          version: '1.0.0',
          bundleUrl: '',
          permissions: [],
          configuration: {},
          icon: '',
          supportEmail: '',
          website: '',
          documentation: '',
          releaseNotes: ''
        });
        fetchApps();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create app');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitForReview = async (bundleId: string) => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('submitAppForReview', {
        bundleId,
        submissionNotes: 'Submitted for initial review'
      });
      if (result.success) {
        toast.success(result.message);
        fetchApps();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit for review');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveReview = async () => {
    if (!selectedReview) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('approveAppVersion', {
        reviewId: selectedReview.id,
        comments: reviewComments
      });
      if (result.success) {
        toast.success(result.message);
        setIsReviewOpen(false);
        setReviewComments('');
        setSelectedReview(null);
        fetchPendingReviews();
        fetchApps();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve app');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectReview = async () => {
    if (!selectedReview || !rejectionReason) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('rejectAppVersion', {
        reviewId: selectedReview.id,
        reason: rejectionReason,
        comments: reviewComments
      });
      if (result.success) {
        toast.success(result.message);
        setIsReviewOpen(false);
        setReviewComments('');
        setRejectionReason('');
        setSelectedReview(null);
        fetchPendingReviews();
        fetchApps();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reject app');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublishVersion = async () => {
    if (!selectedApp || !selectedVersion) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('publishAppVersion', {
        bundleId: selectedApp.id,
        versionId: selectedVersion.id
      });
      if (result.success) {
        toast.success(result.message);
        setIsPublishOpen(false);
        setSelectedVersion(null);
        fetchApps();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish app');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchApps();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'outline' as const, icon: Edit },
      in_review: { variant: 'secondary' as const, icon: Clock },
      approved: { variant: 'default' as const, icon: CheckCircle },
      rejected: { variant: 'destructive' as const, icon: XCircle },
      published: { variant: 'default' as const, icon: Package }
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>App Store Management</CardTitle>
              <CardDescription>Manage applications, versions, and reviews</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create App
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="apps">
                <Package className="mr-2 h-4 w-4" />
                Applications
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <Clock className="mr-2 h-4 w-4" />
                Pending Reviews
                {pendingReviews.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingReviews.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="apps">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search apps..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-8"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apps.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {app.icon ? (
                            <img 
                              src={app.icon} 
                              alt={app.name} 
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{app.name}</h4>
                              {getStatusBadge(app.status)}
                              <Badge variant="outline">{app.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {app.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>v{app.currentVersion}</span>
                              {app.publishedVersion && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Published: v{app.publishedVersion}
                                </span>
                              )}
                              {app.developer && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {app.developer.name}
                                </span>
                              )}
                              <span>{app.stats.versionCount} versions</span>
                              <span>{app.stats.installCount} installs</span>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => fetchAppDetails(app.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {app.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSubmitForReview(app.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Submit for Review
                              </DropdownMenuItem>
                            )}
                            {app.status === 'approved' && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedApp(app);
                                setIsPublishOpen(true);
                              }}>
                                <Package className="mr-2 h-4 w-4" />
                                Publish Version
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}

                    {apps.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No apps found
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {pendingReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No pending reviews</p>
                  </div>
                ) : (
                  pendingReviews.map((review) => (
                    <Card key={review.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {review.appBundle.icon ? (
                            <img 
                              src={review.appBundle.icon} 
                              alt={review.appBundle.name} 
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium">{review.appBundle.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Version {review.version}</span>
                              <span>•</span>
                              <span>Submitted by {review.submittedBy.name}</span>
                              <span>•</span>
                              <span>{new Date(review.submittedAt).toLocaleDateString()}</span>
                            </div>
                            {review.submissionNotes && (
                              <p className="text-sm mt-1">{review.submissionNotes}</p>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => {
                          setSelectedReview(review);
                          setIsReviewOpen(true);
                        }}>
                          Review
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create App Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New App</DialogTitle>
            <DialogDescription>
              Create a new application bundle
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="app-name">App Name</Label>
                <Input
                  id="app-name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="My Amazing App"
                />
              </div>
              <div>
                <Label htmlFor="app-version">Initial Version</Label>
                <Input
                  id="app-version"
                  value={createFormData.version}
                  onChange={(e) => setCreateFormData({ ...createFormData, version: e.target.value })}
                  placeholder="1.0.0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="app-desc">Description</Label>
              <Textarea
                id="app-desc"
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder="Describe your app..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="app-category">Category</Label>
                <Select 
                  value={createFormData.category} 
                  onValueChange={(value) => setCreateFormData({ ...createFormData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="app-bundle">Bundle URL</Label>
                <Input
                  id="app-bundle"
                  value={createFormData.bundleUrl}
                  onChange={(e) => setCreateFormData({ ...createFormData, bundleUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="app-email">Support Email</Label>
                <Input
                  id="app-email"
                  type="email"
                  value={createFormData.supportEmail}
                  onChange={(e) => setCreateFormData({ ...createFormData, supportEmail: e.target.value })}
                  placeholder="support@example.com"
                />
              </div>
              <div>
                <Label htmlFor="app-website">Website</Label>
                <Input
                  id="app-website"
                  value={createFormData.website}
                  onChange={(e) => setCreateFormData({ ...createFormData, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <Label htmlFor="app-notes">Release Notes</Label>
              <Textarea
                id="app-notes"
                value={createFormData.releaseNotes}
                onChange={(e) => setCreateFormData({ ...createFormData, releaseNotes: e.target.value })}
                placeholder="What's new in this version..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateApp} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create App'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review App Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review App Submission</DialogTitle>
            <DialogDescription>
              Review and approve or reject this app version
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{selectedReview.appBundle.name}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <span className="ml-2">{selectedReview.version}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <span className="ml-2">{selectedReview.appBundle.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted by:</span>
                    <span className="ml-2">{selectedReview.submittedBy.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted at:</span>
                    <span className="ml-2">{new Date(selectedReview.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
                {selectedReview.submissionNotes && (
                  <div className="mt-4">
                    <span className="text-muted-foreground">Submission Notes:</span>
                    <p className="mt-1">{selectedReview.submissionNotes}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="review-comments">Review Comments</Label>
                <Textarea
                  id="review-comments"
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Add your review comments..."
                  rows={4}
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Review Actions</AlertTitle>
                <AlertDescription>
                  You can either approve this version for the app store or reject it with a reason.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this version is being rejected..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsReviewOpen(false);
              setReviewComments('');
              setRejectionReason('');
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectReview}
              disabled={!rejectionReason || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
            <Button
              onClick={handleApproveReview}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Version Dialog */}
      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish App Version</DialogTitle>
            <DialogDescription>
              Select a version to publish to the app store
            </DialogDescription>
          </DialogHeader>
          {selectedApp && appDetails && (
            <div className="space-y-4">
              <div>
                <Label>Select Version</Label>
                <Select 
                  value={selectedVersion?.id} 
                  onValueChange={(value) => {
                    const version = appDetails.versions.find((v: AppVersion) => v.id === value);
                    setSelectedVersion(version);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a version" />
                  </SelectTrigger>
                  <SelectContent>
                    {appDetails.versions
                      .filter((v: AppVersion) => v.status === 'approved')
                      .map((v: AppVersion) => (
                        <SelectItem key={v.id} value={v.id}>
                          v{v.version} - Approved {new Date(v.approvedAt!).toLocaleDateString()}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {selectedVersion && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Publishing version {selectedVersion.version} will make it available in the app store for all organizations to install.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPublishOpen(false);
              setSelectedVersion(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handlePublishVersion}
              disabled={!selectedVersion || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Version'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* App Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>App Details</DialogTitle>
          </DialogHeader>
          {appDetails && (
            <ScrollArea className="h-full max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {appDetails.bundle.icon ? (
                      <img 
                        src={appDetails.bundle.icon} 
                        alt={appDetails.bundle.name} 
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">{appDetails.bundle.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(appDetails.bundle.status)}
                        <Badge variant="outline">{appDetails.bundle.category}</Badge>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{appDetails.bundle.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current Version:</span>
                      <span className="ml-2">{appDetails.bundle.currentVersion}</span>
                    </div>
                    {appDetails.bundle.publishedVersion && (
                      <div>
                        <span className="text-muted-foreground">Published Version:</span>
                        <span className="ml-2">{appDetails.bundle.publishedVersion}</span>
                      </div>
                    )}
                    {appDetails.bundle.developer && (
                      <div>
                        <span className="text-muted-foreground">Developer:</span>
                        <span className="ml-2">{appDetails.bundle.developer.name}</span>
                      </div>
                    )}
                    {appDetails.bundle.supportEmail && (
                      <div>
                        <span className="text-muted-foreground">Support:</span>
                        <span className="ml-2">{appDetails.bundle.supportEmail}</span>
                      </div>
                    )}
                  </div>

                  {appDetails.bundle.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={appDetails.bundle.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {appDetails.bundle.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Versions */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Version History
                  </h4>
                  <div className="space-y-2">
                    {appDetails.versions.map((version: AppVersion) => (
                      <Card key={version.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">v{version.version}</span>
                            {getStatusBadge(version.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {version.submittedAt && (
                              <span>Submitted {new Date(version.submittedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        {version.releaseNotes && (
                          <p className="text-sm text-muted-foreground mt-2">{version.releaseNotes}</p>
                        )}
                        {version.rejectionReason && (
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Rejected: {version.rejectionReason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Reviews */}
                {appDetails.reviews.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Review History
                    </h4>
                    <div className="space-y-2">
                      {appDetails.reviews.map((review: AppReview) => (
                        <Card key={review.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">v{review.version}</span>
                              <Badge variant={
                                review.status === 'approved' ? 'default' : 
                                review.status === 'rejected' ? 'destructive' : 
                                'secondary'
                              }>
                                {review.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {review.reviewedAt && (
                                <span>Reviewed {new Date(review.reviewedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          {review.reviewComments && (
                            <p className="text-sm text-muted-foreground mt-2">{review.reviewComments}</p>
                          )}
                          {review.rejectionReason && (
                            <p className="text-sm text-destructive mt-2">Reason: {review.rejectionReason}</p>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
