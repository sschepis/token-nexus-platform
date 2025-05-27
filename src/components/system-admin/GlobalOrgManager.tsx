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
import Parse from 'parse';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  User,
  Users,
  Calendar,
  AlertCircle,
  Loader2,
  Ban,
  CheckCircle,
  Package,
  Edit,
  Eye,
  TrendingUp,
  CreditCard,
  Mail,
  Phone,
  Trash2
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface Organization {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'active' | 'suspended' | 'inactive' | 'deleted';
  planType: string;
  owner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  settings?: Record<string, unknown>;
  industry?: string;
  companySize?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    userCount: number;
    appCount: number;
    contractCount: number;
  };
}

interface OrgStats {
  statusCounts: Record<string, number>;
  planCounts: Record<string, number>;
  totalOrganizations: number;
  totalActiveOrganizations: number;
  totalUsers: number;
  newOrgsThisMonth: number;
}

export function GlobalOrgManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orgStats, setOrgStats] = useState<OrgStats | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  
  const [createFormData, setCreateFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    planType: 'starter',
    ownerEmail: '',
    ownerFirstName: '',
    ownerLastName: '',
    industry: '',
    companySize: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    planType: '',
    industry: '',
    companySize: ''
  });


  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        page: number;
        limit: number;
        sortBy: string;
        sortOrder: string;
        status?: string;
        searchQuery?: string;
      } = {
        page: currentPage,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.searchQuery = searchQuery;

      const result = await Parse.Cloud.run('getAllOrganizations', params);

      if (result.success) {
        setOrganizations(result.organizations);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currentPage, searchQuery]);
  
  useEffect(() => {
    fetchOrganizations();
    fetchStats();
  }, [statusFilter, planFilter, currentPage, fetchOrganizations]);


  const fetchStats = async () => {
    try {
      const result = await Parse.Cloud.run('getOrganizationStats');
      if (result.success) {
        setOrgStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateOrg = async () => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('createOrganizationByAdmin', createFormData);
      if (result.success) {
        toast.success(result.message);
        setIsCreateOpen(false);
        setCreateFormData({
          name: '',
          contactEmail: '',
          contactPhone: '',
          planType: 'starter',
          ownerEmail: '',
          ownerFirstName: '',
          ownerLastName: '',
          industry: '',
          companySize: ''
        });
        fetchOrganizations();
        fetchStats();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create organization');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateOrg = async () => {
    if (!selectedOrg) return;
    
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('updateOrganization', {
        organizationId: selectedOrg.id,
        updates: editFormData
      });
      if (result.success) {
        toast.success(result.message);
        setIsEditOpen(false);
        fetchOrganizations();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update organization');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (org: Organization, newStatus: string) => {
    if (newStatus === 'suspended' && !suspensionReason) {
      setSelectedOrg(org);
      setIsSuspendOpen(true);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('toggleOrganizationStatus', {
        organizationId: org.id,
        status: newStatus,
        reason: suspensionReason
      });
      if (result.success) {
        toast.success(result.message);
        fetchOrganizations();
        setIsSuspendOpen(false);
        setSuspensionReason('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update organization status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteOrg = async (org: Organization, hardDelete = false) => {
    const confirmMsg = hardDelete 
      ? 'Are you sure you want to permanently delete this organization? This action cannot be undone.'
      : 'Are you sure you want to delete this organization?';
    
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('deleteOrganization', {
        organizationId: org.id,
        hardDelete
      });
      if (result.success) {
        toast.success(result.message);
        fetchOrganizations();
        fetchStats();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrganizations();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, icon: CheckCircle },
      suspended: { variant: 'destructive' as const, icon: Ban },
      inactive: { variant: 'secondary' as const, icon: AlertCircle },
      deleted: { variant: 'outline' as const, icon: Trash2 }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanBadge = (planType: string) => {
    const planConfig = {
      starter: { variant: 'secondary' as const },
      professional: { variant: 'default' as const },
      enterprise: { variant: 'outline' as const }
    };
    
    const config = planConfig[planType as keyof typeof planConfig] || planConfig.starter;
    
    return (
      <Badge variant={config.variant}>
        {planType.charAt(0).toUpperCase() + planType.slice(1)}
      </Badge>
    );
  };

  const filteredOrganizations = organizations.filter(org => {
    if (planFilter !== 'all' && org.planType !== planFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {orgStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orgStats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground">
                {orgStats.totalActiveOrganizations} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orgStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orgStats.newOrgsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Organizations created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(orgStats.planCounts).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{plan}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage all organizations on the platform</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
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
            <div className="space-y-4">
              {filteredOrganizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{org.name}</h4>
                      {getStatusBadge(org.status)}
                      {getPlanBadge(org.planType)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {org.contactEmail}
                      </span>
                      {org.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {org.contactPhone}
                        </span>
                      )}
                      {org.owner && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {org.owner.firstName} {org.owner.lastName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{org.stats.userCount} users</span>
                      <span>{org.stats.appCount} apps</span>
                      <span>{org.stats.contractCount} contracts</span>
                      <span>Created {new Date(org.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedOrg(org);
                        setIsDetailOpen(true);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedOrg(org);
                        setEditFormData({
                          name: org.name,
                          contactEmail: org.contactEmail,
                          contactPhone: org.contactPhone || '',
                          planType: org.planType,
                          industry: org.industry || '',
                          companySize: org.companySize || ''
                        });
                        setIsEditOpen(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        window.location.href = `/system-admin/organizations/${org.id}/integrations`;
                      }}>
                        <Package className="mr-2 h-4 w-4" />
                        Manage Integrations
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {org.status === 'active' ? (
                        <DropdownMenuItem onClick={() => handleToggleStatus(org, 'suspended')}>
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleToggleStatus(org, 'active')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteOrg(org)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {filteredOrganizations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No organizations found
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
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Create a new organization and owner account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <Label htmlFor="plan-type">Plan Type</Label>
                <Select 
                  value={createFormData.planType} 
                  onValueChange={(value) => setCreateFormData({ ...createFormData, planType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={createFormData.contactEmail}
                  onChange={(e) => setCreateFormData({ ...createFormData, contactEmail: e.target.value })}
                  placeholder="contact@acme.com"
                />
              </div>
              <div>
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={createFormData.contactPhone}
                  onChange={(e) => setCreateFormData({ ...createFormData, contactPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Owner Account</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="owner-email">Owner Email</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    value={createFormData.ownerEmail}
                    onChange={(e) => setCreateFormData({ ...createFormData, ownerEmail: e.target.value })}
                    placeholder="admin@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="owner-first">First Name</Label>
                  <Input
                    id="owner-first"
                    value={createFormData.ownerFirstName}
                    onChange={(e) => setCreateFormData({ ...createFormData, ownerFirstName: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="owner-last">Last Name</Label>
                  <Input
                    id="owner-last"
                    value={createFormData.ownerLastName}
                    onChange={(e) => setCreateFormData({ ...createFormData, ownerLastName: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={createFormData.industry}
                  onChange={(e) => setCreateFormData({ ...createFormData, industry: e.target.value })}
                  placeholder="Technology"
                />
              </div>
              <div>
                <Label htmlFor="company-size">Company Size</Label>
                <Select 
                  value={createFormData.companySize} 
                  onValueChange={(value) => setCreateFormData({ ...createFormData, companySize: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="500+">500+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrg} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Organization Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Contact Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.contactEmail}
                onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Contact Phone</Label>
              <Input
                id="edit-phone"
                value={editFormData.contactPhone}
                onChange={(e) => setEditFormData({ ...editFormData, contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-plan">Plan Type</Label>
              <Select 
                value={editFormData.planType} 
                onValueChange={(value) => setEditFormData({ ...editFormData, planType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrg} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Organization'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Organization Dialog */}
      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Organization</DialogTitle>
            <DialogDescription>
              Provide a reason for suspending {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="suspension-reason">Suspension Reason</Label>
            <Textarea
              id="suspension-reason"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="Enter the reason for suspension..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsSuspendOpen(false);
              setSuspensionReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedOrg && handleToggleStatus(selectedOrg, 'suspended')}
              disabled={!suspensionReason || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                'Suspend Organization'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Organization Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Organization Details</DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedOrg.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrg.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Plan Type</Label>
                  <div className="mt-1">{getPlanBadge(selectedOrg.planType)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact Email</Label>
                  <p className="font-medium">{selectedOrg.contactEmail}</p>
                </div>
                {selectedOrg.contactPhone && (
                  <div>
                    <Label className="text-muted-foreground">Contact Phone</Label>
                    <p className="font-medium">{selectedOrg.contactPhone}</p>
                  </div>
                )}
                {selectedOrg.owner && (
                  <div>
                    <Label className="text-muted-foreground">Owner</Label>
                    <p className="font-medium">
                      {selectedOrg.owner.firstName} {selectedOrg.owner.lastName}
                      <span className="text-sm text-muted-foreground block">
                        {selectedOrg.owner.email}
                      </span>
                    </p>
                  </div>
                )}
                {selectedOrg.industry && (
                  <div>
                    <Label className="text-muted-foreground">Industry</Label>
                    <p className="font-medium">{selectedOrg.industry}</p>
                  </div>
                )}
                {selectedOrg.companySize && (
                  <div>
                    <Label className="text-muted-foreground">Company Size</Label>
                    <p className="font-medium">{selectedOrg.companySize}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedOrg.stats.userCount}</span>
                        <span className="text-muted-foreground">Users</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedOrg.stats.appCount}</span>
                        <span className="text-muted-foreground">Apps</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedOrg.stats.contractCount}</span>
                        <span className="text-muted-foreground">Contracts</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="border-t pt-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(selectedOrg.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Last Updated</span>
                  <span>{new Date(selectedOrg.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
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