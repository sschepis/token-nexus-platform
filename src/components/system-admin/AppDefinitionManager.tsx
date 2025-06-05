import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Star,
  Calendar,
  User,
  Globe,
  Mail,
  Tag,
  Loader2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Settings,
  Archive
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import Parse from 'parse';

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

interface Category {
  value: string;
  label: string;
}

interface AppDefinitionManagerProps {
  appDefinitions: AppDefinitionForMarketplace[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  categories: Category[];
  onRefresh: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  formatDate: (dateString: string) => string;
}

export function AppDefinitionManager({
  appDefinitions,
  loading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  onRefresh,
  getStatusBadge,
  formatDate
}: AppDefinitionManagerProps) {
  const [selectedApp, setSelectedApp] = useState<AppDefinitionForMarketplace | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'productivity',
    publisherName: '',
    iconUrl: '',
    tags: '',
    website: '',
    supportEmail: '',
    isFeatured: false
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'productivity',
      publisherName: '',
      iconUrl: '',
      tags: '',
      website: '',
      supportEmail: '',
      isFeatured: false
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (app: AppDefinitionForMarketplace) => {
    setSelectedApp(app);
    setFormData({
      name: app.name,
      description: app.description,
      category: app.category,
      publisherName: app.publisherName,
      iconUrl: app.iconUrl || '',
      tags: app.tags.join(', '),
      website: '',
      supportEmail: '',
      isFeatured: app.isFeatured
    });
    setIsEditOpen(true);
  };

  const openDetailDialog = (app: AppDefinitionForMarketplace) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const openDeleteDialog = (app: AppDefinitionForMarketplace) => {
    setSelectedApp(app);
    setIsDeleteOpen(true);
  };

  const handleCreateApp = async () => {
    setIsProcessing(true);
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const result = await Parse.Cloud.run('createAppDefinition', {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        publisherName: formData.publisherName,
        iconUrl: formData.iconUrl || undefined,
        tags: tagsArray,
        isFeatured: formData.isFeatured
      });

      if (result.success) {
        toast.success('App definition created successfully');
        setIsCreateOpen(false);
        resetForm();
        onRefresh();
      }
    } catch (error) {
      console.error('Error creating app definition:', error);
      toast.error('Failed to create app definition');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateApp = async () => {
    if (!selectedApp) return;

    setIsProcessing(true);
    try {
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const result = await Parse.Cloud.run('updateAppDefinition', {
        appDefinitionId: selectedApp.id,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        publisherName: formData.publisherName,
        iconUrl: formData.iconUrl || undefined,
        tags: tagsArray,
        isFeatured: formData.isFeatured
      });

      if (result.success) {
        toast.success('App definition updated successfully');
        setIsEditOpen(false);
        setSelectedApp(null);
        resetForm();
        onRefresh();
      }
    } catch (error) {
      console.error('Error updating app definition:', error);
      toast.error('Failed to update app definition');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!selectedApp) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('deleteAppDefinition', {
        appDefinitionId: selectedApp.id
      });

      if (result.success) {
        toast.success('App definition deleted successfully');
        setIsDeleteOpen(false);
        setSelectedApp(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting app definition:', error);
      toast.error('Failed to delete app definition');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleFeatured = async (app: AppDefinitionForMarketplace) => {
    try {
      const result = await Parse.Cloud.run('updateAppDefinition', {
        appDefinitionId: app.id,
        isFeatured: !app.isFeatured
      });

      if (result.success) {
        toast.success(`App ${app.isFeatured ? 'unfeatured' : 'featured'} successfully`);
        onRefresh();
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error('Failed to update featured status');
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    onRefresh();
  };

  // Pagination
  const totalPages = Math.ceil(appDefinitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApps = appDefinitions.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">App Definitions</h3>
          <p className="text-sm text-muted-foreground">
            Manage app definitions and marketplace listings
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create App Definition
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search app definitions..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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

      {/* App List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {currentApps.map((app) => (
            <Card key={app.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {app.iconUrl && (
                    <img 
                      src={app.iconUrl} 
                      alt={app.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{app.name}</h4>
                      {getStatusBadge(app.status)}
                      {app.isFeatured && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {app.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {app.publisherName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {app.category}
                      </div>
                      {app.overallRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-current text-yellow-500" />
                          {app.overallRating.toFixed(1)} ({app.reviewCount} reviews)
                        </div>
                      )}
                      {app.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(app.createdAt)}
                        </div>
                      )}
                    </div>

                    {app.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {app.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {app.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{app.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDetailDialog(app)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(app)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleFeatured(app)}>
                      <Star className="mr-2 h-4 w-4" />
                      {app.isFeatured ? 'Unfeature' : 'Feature'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => openDeleteDialog(app)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setSelectedApp(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isCreateOpen ? 'Create App Definition' : 'Edit App Definition'}
            </DialogTitle>
            <DialogDescription>
              {isCreateOpen 
                ? 'Create a new app definition for the marketplace'
                : 'Update the app definition details'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">App Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter app name"
                />
              </div>
              <div>
                <Label htmlFor="publisherName">Publisher Name *</Label>
                <Input
                  id="publisherName"
                  value={formData.publisherName}
                  onChange={(e) => setFormData(prev => ({ ...prev, publisherName: e.target.value }))}
                  placeholder="Enter publisher name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter app description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
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
                <Label htmlFor="iconUrl">Icon URL</Label>
                <Input
                  id="iconUrl"
                  value={formData.iconUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, iconUrl: e.target.value }))}
                  placeholder="https://example.com/icon.png"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateOpen(false);
              setIsEditOpen(false);
              setSelectedApp(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={isCreateOpen ? handleCreateApp : handleUpdateApp} 
              disabled={isProcessing || !formData.name || !formData.description}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreateOpen ? 'Create App' : 'Update App'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>App Definition Details</DialogTitle>
          </DialogHeader>

          {selectedApp && (
            <ScrollArea className="h-full max-h-[60vh]">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  {selectedApp.iconUrl && (
                    <img 
                      src={selectedApp.iconUrl} 
                      alt={selectedApp.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{selectedApp.name}</h3>
                      {getStatusBadge(selectedApp.status)}
                      {selectedApp.isFeatured && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{selectedApp.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Publisher</Label>
                    <p className="text-sm">{selectedApp.publisherName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <p className="text-sm">{selectedApp.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Rating</Label>
                    <p className="text-sm">
                      {selectedApp.overallRating > 0 
                        ? `${selectedApp.overallRating.toFixed(1)} (${selectedApp.reviewCount} reviews)`
                        : 'No ratings yet'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm">
                      {selectedApp.createdAt ? formatDate(selectedApp.createdAt) : 'Unknown'}
                    </p>
                  </div>
                </div>

                {selectedApp.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedApp.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">{tag}</Badge>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete App Definition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this app definition? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedApp && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are about to delete <strong>{selectedApp.name}</strong>. 
                This will also remove all associated versions and installations.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteApp}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}