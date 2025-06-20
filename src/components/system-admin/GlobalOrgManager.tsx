import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  fetchAllOrganizationsAdmin,
  createOrgByAdmin,
  suspendOrgByAdmin,
  activateOrgByAdmin,
  Organization
} from '@/store/slices/orgSlice';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Calendar,
  AlertCircle,
  Loader2,
  Ban,
  CheckCircle,
  Shield,
  Mail,
  Eye,
  UserX,
  UserCheck,
  Clock,
  Activity,
  TrendingUp,
  Users,
  ShieldCheck,
  MailCheck,
  Trash2,
  Edit,
  Globe,
  Settings
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CreateOrgFormData {
  name: string;
  ownerEmail: string;
  planType: string;
  description: string;
  subdomain: string;
  industry: string;
}

export const GlobalOrgManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const { allOrganizations, isAdminLoading, adminError } = useAppSelector((state) => state.org);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showOrgDetails, setShowOrgDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [createFormData, setCreateFormData] = useState<CreateOrgFormData>({
    name: '',
    ownerEmail: '',
    planType: 'free',
    description: '',
    subdomain: '',
    industry: ''
  });

  // Load organizations on component mount
  useEffect(() => {
    dispatch(fetchAllOrganizationsAdmin());
  }, [dispatch]);

  // Filter organizations based on search and filters
  const filteredOrganizations = allOrganizations.filter(org => {
    const matchesSearch = org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    const matchesPlan = planFilter === 'all' || org.plan === planFilter || org.planType === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleCreateOrg = async () => {
    if (!createFormData.name || !createFormData.ownerEmail) {
      toast.error('Name and owner email are required');
      return;
    }

    setIsCreating(true);
    try {
      await dispatch(createOrgByAdmin(createFormData)).unwrap();
      setShowCreateDialog(false);
      setCreateFormData({
        name: '',
        ownerEmail: '',
        planType: 'free',
        description: '',
        subdomain: '',
        industry: ''
      });
      // Refresh the organizations list
      dispatch(fetchAllOrganizationsAdmin());
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuspendOrg = async (orgId: string) => {
    try {
      await dispatch(suspendOrgByAdmin(orgId)).unwrap();
      dispatch(fetchAllOrganizationsAdmin());
    } catch (error) {
      console.error('Failed to suspend organization:', error);
    }
  };

  const handleActivateOrg = async (orgId: string) => {
    try {
      await dispatch(activateOrgByAdmin(orgId)).unwrap();
      dispatch(fetchAllOrganizationsAdmin());
    } catch (error) {
      console.error('Failed to activate organization:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" />Enterprise</Badge>;
      case 'standard':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><TrendingUp className="w-3 h-3 mr-1" />Standard</Badge>;
      case 'free':
        return <Badge variant="outline"><Users className="w-3 h-3 mr-1" />Free</Badge>;
      default:
        return <Badge variant="outline">{plan || 'Unknown'}</Badge>;
    }
  };

  if (adminError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load organizations: {adminError}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">Manage all organizations in the system</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Organizations</p>
                <p className="text-2xl font-bold">{allOrganizations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {allOrganizations.filter(org => org.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Ban className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold">
                  {allOrganizations.filter(org => org.status === 'suspended').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Enterprise</p>
                <p className="text-2xl font-bold">
                  {allOrganizations.filter(org => org.plan === 'enterprise' || org.planType === 'enterprise').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations ({filteredOrganizations.length})</CardTitle>
          <CardDescription>
            {isAdminLoading ? 'Loading organizations...' : `Showing ${filteredOrganizations.length} of ${allOrganizations.length} organizations`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdminLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading organizations...</span>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No organizations found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' || planFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first organization'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && planFilter === 'all' && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrganizations.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{org.name}</h3>
                        {getStatusBadge(org.status || 'unknown')}
                        {getPlanBadge(org.plan || org.planType || 'free')}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {org.subdomain && (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            {org.subdomain}
                          </span>
                        )}
                        {org.industry && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {org.industry}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created {new Date(org.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {org.description && (
                        <p className="text-sm text-muted-foreground mt-1">{org.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedOrg(org);
                        setShowOrgDetails(true);
                      }}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {org.status === 'active' ? (
                        <DropdownMenuItem 
                          onClick={() => handleSuspendOrg(org.id)}
                          className="text-red-600"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => handleActivateOrg(org.id)}
                          className="text-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization and assign an owner.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="ownerEmail">Owner Email *</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={createFormData.ownerEmail}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="Enter owner email"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subdomain">Subdomain</Label>
              <Input
                id="subdomain"
                value={createFormData.subdomain}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                placeholder="Enter subdomain"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={createFormData.industry}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, industry: e.target.value }))}
                placeholder="Enter industry"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="planType">Plan Type</Label>
              <Select value={createFormData.planType} onValueChange={(value) => setCreateFormData(prev => ({ ...prev, planType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrg} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Details Dialog */}
      <Dialog open={showOrgDetails} onOpenChange={setShowOrgDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Organization Details</DialogTitle>
            <DialogDescription>
              View detailed information about {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrg && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrg.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrg.status || 'unknown')}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Plan</Label>
                  <div className="mt-1">{getPlanBadge(selectedOrg.plan || selectedOrg.planType || 'free')}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subdomain</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrg.subdomain || 'Not set'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Industry</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrg.industry || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedOrg.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {selectedOrg.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedOrg.description}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Organization ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{selectedOrg.id}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrgDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalOrgManager;