import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Trash2,
  Archive,
  RefreshCw,
  ShieldCheck,
  GitBranch,
  UserPlus,
  ArrowRight,
  Building,
  Crown
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ParentOrg {
  id: string;
  name: string;
  contactEmail: string;
  isParentOrg: boolean;
  settings?: {
    allowChildOrgs?: boolean;
    maxChildOrgs?: number;
    features?: Record<string, boolean>;
  };
}

interface ChildOrg {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'active' | 'suspended' | 'archived';
  planType: string;
  owner?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  industry?: string;
  companySize?: string;
  createdAt: string;
  updatedAt: string;
  stats: {
    userCount: number;
  };
}

export function OrgLifecycleManager() {
  const [parentOrg, setParentOrg] = useState<ParentOrg | null>(null);
  const [childOrgs, setChildOrgs] = useState<ChildOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<ChildOrg | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInitializeOpen, setIsInitializeOpen] = useState(false);
  const [isLifecycleOpen, setIsLifecycleOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lifecycleAction, setLifecycleAction] = useState<string>('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  
  const [initFormData, setInitFormData] = useState({
    name: '',
    contactEmail: '',
    contactPhone: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: ''
  });

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

  useEffect(() => {
    checkParentOrg();
  }, []);

  useEffect(() => {
    if (parentOrg) {
      fetchChildOrgs();
    }
  }, [parentOrg, statusFilter, currentPage]);

  const checkParentOrg = async () => {
    setLoading(true);
    try {
      // Check if parent org exists
      const Organization = Parse.Object.extend('Organization');
      const query = new Parse.Query(Organization);
      query.equalTo('isParentOrg', true);
      const parent = await query.first();

      if (parent) {
        setParentOrg({
          id: parent.id,
          name: parent.get('name'),
          contactEmail: parent.get('contactEmail'),
          isParentOrg: true,
          settings: parent.get('settings')
        });
      }
    } catch (error) {
      console.error('Error checking parent org:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildOrgs = async () => {
    if (!parentOrg) return;

    setLoading(true);
    try {
      const params: {
        parentOrgId: string;
        page: number;
        limit: number;
        status?: string;
        searchQuery?: string;
      } = {
        parentOrgId: parentOrg.id,
        page: currentPage,
        limit: 20
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery) {
        params.searchQuery = searchQuery;
      }

      const result = await Parse.Cloud.run('getChildOrganizations', params);

      if (result.success) {
        setChildOrgs(result.children);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Error fetching child orgs:', error);
      toast.error('Failed to fetch child organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeParent = async () => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('initializeParentOrganization', initFormData);
      if (result.success) {
        toast.success(result.message);
        setIsInitializeOpen(false);
        checkParentOrg();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize parent organization');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateChild = async () => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('createChildOrganization', {
        ...createFormData,
        parentOrgId: parentOrg?.id
      });
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
        fetchChildOrgs();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create child organization');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLifecycleAction = async () => {
    if (!selectedOrg || !lifecycleAction) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('updateOrganizationLifecycle', {
        organizationId: selectedOrg.id,
        action: lifecycleAction,
        reason: lifecycleReason
      });
      if (result.success) {
        toast.success(result.message);
        setIsLifecycleOpen(false);
        setLifecycleAction('');
        setLifecycleReason('');
        fetchChildOrgs();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update organization lifecycle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedOrg || !newOwnerEmail) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('transferOrganizationOwnership', {
        organizationId: selectedOrg.id,
        newOwnerEmail
      });
      if (result.success) {
        toast.success(result.message);
        setIsTransferOpen(false);
        setNewOwnerEmail('');
        fetchChildOrgs();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to transfer ownership');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchChildOrgs();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, icon: CheckCircle },
      suspended: { variant: 'destructive' as const, icon: Ban },
      archived: { variant: 'secondary' as const, icon: Archive }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
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

  if (loading && !parentOrg) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!parentOrg) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Parent Organization Not Initialized</AlertTitle>
          <AlertDescription>
            No parent organization has been set up yet. Initialize the parent organization to start managing the organization lifecycle.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Initialize Parent Organization</CardTitle>
            <CardDescription>
              Set up the parent organization that will manage all child organizations on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsInitializeOpen(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Initialize Parent Organization
            </Button>
          </CardContent>
        </Card>

        {/* Initialize Dialog */}
        <Dialog open={isInitializeOpen} onOpenChange={setIsInitializeOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Initialize Parent Organization</DialogTitle>
              <DialogDescription>
                Set up the parent organization and admin account
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="parent-name">Organization Name</Label>
                <Input
                  id="parent-name"
                  value={initFormData.name}
                  onChange={(e) => setInitFormData({ ...initFormData, name: e.target.value })}
                  placeholder="Platform Parent Organization"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="parent-email">Contact Email</Label>
                  <Input
                    id="parent-email"
                    type="email"
                    value={initFormData.contactEmail}
                    onChange={(e) => setInitFormData({ ...initFormData, contactEmail: e.target.value })}
                    placeholder="contact@platform.com"
                  />
                </div>
                <div>
                  <Label htmlFor="parent-phone">Contact Phone</Label>
                  <Input
                    id="parent-phone"
                    value={initFormData.contactPhone}
                    onChange={(e) => setInitFormData({ ...initFormData, contactPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Admin Account</h4>
                <div>
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={initFormData.adminEmail}
                    onChange={(e) => setInitFormData({ ...initFormData, adminEmail: e.target.value })}
                    placeholder="admin@platform.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-first">First Name</Label>
                    <Input
                      id="admin-first"
                      value={initFormData.adminFirstName}
                      onChange={(e) => setInitFormData({ ...initFormData, adminFirstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-last">Last Name</Label>
                    <Input
                      id="admin-last"
                      value={initFormData.adminLastName}
                      onChange={(e) => setInitFormData({ ...initFormData, adminLastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInitializeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInitializeParent} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Initialize'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Parent Org Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <CardTitle>Parent Organization</CardTitle>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Parent Org
            </Badge>
          </div>
          <CardDescription>{parentOrg.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {parentOrg.contactEmail}
            </span>
            {parentOrg.settings?.maxChildOrgs && parentOrg.settings.maxChildOrgs > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Max Child Orgs: {parentOrg.settings.maxChildOrgs}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Child Organizations */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Child Organizations</CardTitle>
              <CardDescription>Manage organizations under the parent organization</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Child Organization
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
                <SelectItem value="archived">Archived</SelectItem>
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
              {childOrgs.map((org) => (
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
                      {org.industry && <span>Industry: {org.industry}</span>}
                      {org.companySize && <span>Size: {org.companySize}</span>}
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
                        setLifecycleAction(org.status === 'active' ? 'suspend' : 'activate');
                        setIsLifecycleOpen(true);
                      }}>
                        {org.status === 'active' ? (
                          <>
                            <Ban className="mr-2 h-4 w-4" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      {org.status !== 'archived' && (
                        <DropdownMenuItem onClick={() => {
                          setSelectedOrg(org);
                          setLifecycleAction('archive');
                          setIsLifecycleOpen(true);
                        }}>
                          <Archive className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      {org.status === 'archived' && (
                        <DropdownMenuItem onClick={() => {
                          setSelectedOrg(org);
                          setLifecycleAction('reactivate');
                          setIsLifecycleOpen(true);
                        }}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setSelectedOrg(org);
                        setIsTransferOpen(true);
                      }}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Transfer Ownership
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {childOrgs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No child organizations found
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

      {/* Create Child Organization Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Child Organization</DialogTitle>
            <DialogDescription>
              Create a new organization under the parent organization
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
            <Button onClick={handleCreateChild} disabled={isProcessing}>
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

      {/* Lifecycle Action Dialog */}
      <Dialog open={isLifecycleOpen} onOpenChange={setIsLifecycleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {lifecycleAction === 'suspend' && 'Suspend Organization'}
              {lifecycleAction === 'activate' && 'Activate Organization'}
              {lifecycleAction === 'archive' && 'Archive Organization'}
              {lifecycleAction === 'reactivate' && 'Reactivate Organization'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrg && `${selectedOrg.name} will be ${lifecycleAction}d`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {['suspend', 'archive'].includes(lifecycleAction) && (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={lifecycleReason}
                  onChange={(e) => setLifecycleReason(e.target.value)}
                  placeholder={`Enter the reason for ${lifecycleAction}ing this organization...`}
                  rows={4}
                />
              </div>
            )}
            {lifecycleAction === 'activate' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will reactivate the organization and restore access for all active users.
                </AlertDescription>
              </Alert>
            )}
            {lifecycleAction === 'reactivate' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will unarchive the organization and restore it to active status.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsLifecycleOpen(false);
              setLifecycleReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant={['suspend', 'archive'].includes(lifecycleAction) ? 'destructive' : 'default'}
              onClick={handleLifecycleAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `${lifecycleAction.charAt(0).toUpperCase() + lifecycleAction.slice(1)} Organization`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Organization Ownership</DialogTitle>
            <DialogDescription>
              Transfer ownership of {selectedOrg?.name} to another user
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-owner">New Owner Email</Label>
            <Input
              id="new-owner"
              type="email"
              value={newOwnerEmail}
              onChange={(e) => setNewOwnerEmail(e.target.value)}
              placeholder="newowner@example.com"
            />
            <p className="text-sm text-muted-foreground mt-2">
              The new owner must have an existing account on the platform.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsTransferOpen(false);
              setNewOwnerEmail('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleTransferOwnership}
              disabled={!newOwnerEmail || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                'Transfer Ownership'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}