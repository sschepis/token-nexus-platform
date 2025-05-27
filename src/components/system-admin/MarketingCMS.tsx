/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Parse from 'parse';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  MoreVertical,
  Eye,
  Clock,
  Calendar,
  User,
  AlertCircle,
  Loader2,
  Globe,
  Image,
  Tag,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type ContentType = 'page' | 'blog' | 'announcement' | 'feature' | 'help';
type ContentStatus = 'draft' | 'published' | 'archived';

interface MarketingContent {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  status: ContentStatus;
  content: string | Record<string, unknown>;
  excerpt?: string;
  featuredImage?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
  };
  tags: string[];
  categories: string[];
  author: {
    id: string;
    name: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  publishedAt?: string;
  scheduledAt?: string;
  viewCount: number;
  isFeatured: boolean;
  sortOrder: number;
  language: string;
  createdAt: string;
  updatedAt: string;
}

interface FetchContentsParams {
  page: number;
  limit: number;
  status?: string;
  contentType?: string;
}

const MarketingCMS = () => {
  const [contents, setContents] = useState<MarketingContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditor, setShowEditor] = useState(false);
  const [editingContent, setEditingContent] = useState<MarketingContent | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    contentType: ContentType;
    content: string;
    excerpt: string;
    featuredImage: string;
    seo: {
      title: string;
      description: string;
      keywords: string;
      ogImage: string;
    };
    tags: string[];
    categories: string[];
    status: ContentStatus;
    scheduledAt: string;
    isFeatured: boolean;
    sortOrder: number;
    language: string;
  }>({
    title: '',
    slug: '',
    contentType: 'page',
    content: '',
    excerpt: '',
    featuredImage: '',
    seo: {
      title: '',
      description: '',
      keywords: '',
      ogImage: ''
    },
    tags: [],
    categories: [],
    status: 'draft',
    scheduledAt: '',
    isFeatured: false,
    sortOrder: 0,
    language: 'en'
  });

  const contentTypes = [
    { value: 'page', label: 'Page', icon: FileText },
    { value: 'blog', label: 'Blog Post', icon: Edit },
    { value: 'announcement', label: 'Announcement', icon: AlertCircle },
    { value: 'feature', label: 'Feature', icon: Star },
    { value: 'help', label: 'Help Article', icon: AlertCircle }
  ];

  const statuses = [
    { value: 'draft', label: 'Draft', variant: 'secondary' as const },
    { value: 'published', label: 'Published', variant: 'default' as const },
    { value: 'archived', label: 'Archived', variant: 'outline' as const }
  ];

  const fetchContents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: FetchContentsParams = {
        page,
        limit: 20
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (contentTypeFilter !== 'all') {
        params.contentType = contentTypeFilter;
      }

      const result = await Parse.Cloud.run('getAdminMarketingContent', params);

      if (result.success) {
        setContents(result.contents);
        setTotalPages(result.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, contentTypeFilter]);

  useEffect(() => {
    fetchContents();
  }, [statusFilter, contentTypeFilter, fetchContents]);

  const handleCreateNew = () => {
    setEditingContent(null);
    setFormData({
      title: '',
      slug: '',
      contentType: 'page',
      content: '',
      excerpt: '',
      featuredImage: '',
      seo: {
        title: '',
        description: '',
        keywords: '',
        ogImage: ''
      },
      tags: [],
      categories: [],
      status: 'draft',
      scheduledAt: '',
      isFeatured: false,
      sortOrder: 0,
      language: 'en'
    });
    setShowEditor(true);
  };

  const handleEdit = (content: MarketingContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      slug: content.slug,
      contentType: content.contentType,
      content: typeof content.content === 'string' ? content.content : JSON.stringify(content.content || ''),
      excerpt: content.excerpt || '',
      featuredImage: content.featuredImage || '',
      seo: {
        title: content.seo?.title || '',
        description: content.seo?.description || '',
        keywords: content.seo?.keywords || '',
        ogImage: content.seo?.ogImage || ''
      },
      tags: content.tags || [],
      categories: content.categories || [],
      status: content.status,
      scheduledAt: content.scheduledAt || '',
      isFeatured: content.isFeatured || false,
      sortOrder: content.sortOrder || 0,
      language: content.language || 'en'
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      toast.error('Title and slug are required');
      return;
    }

    setSaving(true);
    try {
      const params = {
        ...formData,
        contentId: editingContent?.id
      };

      const result = await Parse.Cloud.run('upsertMarketingContent', params);

      if (result.success) {
        toast.success(result.message);
        setShowEditor(false);
        fetchContents(currentPage);
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contentId: string) => {
    if (!confirm('Are you sure you want to delete this content?')) {
      return;
    }

    try {
      const result = await Parse.Cloud.run('deleteMarketingContent', { contentId });

      if (result.success) {
        toast.success(result.message);
        fetchContents(currentPage);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const getStatusBadge = (status: string) => {
    const config = statuses.find(s => s.value === status) || statuses[0];
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getContentTypeIcon = (type: string) => {
    const config = contentTypes.find(t => t.value === type) || contentTypes[0];
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  const filteredContents = contents.filter(content =>
    content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Marketing CMS</h2>
          <p className="text-muted-foreground">Manage marketing content and pages</p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Content
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {contentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContents.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {content.isFeatured && <Star className="h-4 w-4 text-yellow-500" />}
                            {content.title}
                          </div>
                          <div className="text-sm text-muted-foreground">{content.slug}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getContentTypeIcon(content.contentType)}
                          <span className="capitalize">{content.contentType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(content.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{content.author.name}</div>
                          <div className="text-muted-foreground">{content.author.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{content.viewCount}</TableCell>
                      <TableCell>
                        {content.publishedAt ? 
                          new Date(content.publishedAt).toLocaleDateString() : 
                          '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(content)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(content.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchContents(currentPage - 1)}
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
                    onClick={() => fetchContents(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Content Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? 'Edit Content' : 'Create New Content'}
            </DialogTitle>
            <DialogDescription>
              Create or edit marketing content for your platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (!editingContent) {
                      setFormData(prev => ({ 
                        ...prev, 
                        slug: generateSlug(e.target.value) 
                      }));
                    }
                  }}
                  placeholder="Page title"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="page-slug"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contentType">Content Type</Label>
                <Select 
                  value={formData.contentType} 
                  onValueChange={(value) => setFormData({ ...formData, contentType: value as ContentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as ContentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief description of the content"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Main content (supports Markdown)"
                rows={10}
              />
            </div>

            <div>
              <Label htmlFor="featuredImage">Featured Image URL</Label>
              <Input
                id="featuredImage"
                value={formData.featuredImage}
                onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
                />
                <Label>Featured Content</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
            </div>

            {/* SEO Settings */}
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">SEO Settings</h4>
              <div>
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={formData.seo.title}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    seo: { ...formData.seo, title: e.target.value }
                  })}
                  placeholder="SEO optimized title"
                />
              </div>
              <div>
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seo.description}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    seo: { ...formData.seo, description: e.target.value }
                  })}
                  placeholder="Meta description"
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Content'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingCMS;
