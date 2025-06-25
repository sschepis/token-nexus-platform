import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Parse from 'parse';
import { safeParseCloudRun } from '@/utils/parseUtils';
import { AlertCircle, Loader2, ShieldCheck, Zap } from 'lucide-react';

// Hooks
import { usePageController } from '@/hooks/usePageController';
import { usePermission } from '@/hooks/usePermission';
import { useAppSelector } from '@/store/hooks';

// Import our modular components
import { ParentOrgCard } from './ParentOrgCard';
import { ChildOrgsList } from './ChildOrgsList';
import { InitializeParentDialog } from './InitializeParentDialog';
import { CreateChildOrgDialog } from './CreateChildOrgDialog';
import { LifecycleActionDialog } from './LifecycleActionDialog';
import { TransferOwnershipDialog } from './TransferOwnershipDialog';

// Import types
import { ParentOrg, ChildOrg, InitFormData, CreateFormData } from './types';

export function OrgLifecycleManager() {
  // Permission and page controller hooks
  const { hasPermission, checkAnyPermission } = usePermission();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  
  const pageController = usePageController({
    pageId: 'org-lifecycle',
    pageName: 'Organization Lifecycle Management',
    description: 'Comprehensive organization lifecycle management interface with parent and child organization controls',
    category: 'system-admin',
    permissions: ['system:admin', 'org_admin'],
    tags: ['organizations', 'lifecycle', 'parent-org', 'child-org', 'system-admin']
  });

  // Permission checks
  const canManageOrgs = checkAnyPermission(['system:admin', 'org_admin']);
  const isSystemAdmin = currentUser?.isAdmin === true;

  // State management
  const [parentOrg, setParentOrg] = useState<ParentOrg | null>(null);
  const [childOrgs, setChildOrgs] = useState<ChildOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<ChildOrg | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [controllerError, setControllerError] = useState<string>('');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInitializeOpen, setIsInitializeOpen] = useState(false);
  const [isLifecycleOpen, setIsLifecycleOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Action states
  const [lifecycleAction, setLifecycleAction] = useState<string>('');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');

  // Form data
  const [initFormData, setInitFormData] = useState<InitFormData>({
    name: '',
    contactEmail: '',
    contactPhone: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: ''
  });

  const [createFormData, setCreateFormData] = useState<CreateFormData>({
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

  // Effects
  useEffect(() => {
    if (canManageOrgs) {
      checkParentOrg();
    }
  }, [canManageOrgs]);

  useEffect(() => {
    if (parentOrg && canManageOrgs) {
      fetchChildOrgs();
    }
  }, [parentOrg, statusFilter, currentPage, canManageOrgs]);

  // API functions using page controller actions
  const checkParentOrg = async () => {
    if (!pageController.isRegistered) {
      setControllerError("Page controller not registered");
      setLoading(false);
      return;
    }

    setLoading(true);
    setControllerError('');
    
    try {
      const result = await pageController.executeAction('viewParentOrg', {});
      
      if (result.success && result.data) {
        setParentOrg(result.data as ParentOrg);
      } else {
        // No parent org found is not an error, just means it needs to be initialized
        setParentOrg(null);
      }
    } catch (error) {
      console.error('Error checking parent org:', error);
      setControllerError('Failed to check parent organization status');
    } finally {
      setLoading(false);
    }
  };

  const fetchChildOrgs = async () => {
    if (!parentOrg || !pageController.isRegistered) return;

    setLoading(true);
    try {
      const params: any = {
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

      const result = await pageController.executeAction('viewChildOrgs', params);

      if (result.success && result.data) {
        const data = result.data as any;
        setChildOrgs(data.children || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setControllerError(result.error || 'Failed to fetch child organizations');
      }
    } catch (error) {
      console.error('Error fetching child orgs:', error);
      setControllerError('Failed to fetch child organizations');
      toast.error('Failed to fetch child organizations');
    } finally {
      setLoading(false);
    }
  };

  // Handler functions using page controller actions
  const handleInitializeParent = async () => {
    if (!pageController.isRegistered) {
      setControllerError("Cannot initialize: Page controller not registered");
      return;
    }

    setIsProcessing(true);
    setControllerError('');
    
    try {
      const result = await pageController.executeAction('initializeParentOrg', { ...initFormData });
      
      if (result.success) {
        toast.success(result.message || 'Parent organization initialized successfully');
        setIsInitializeOpen(false);
        checkParentOrg();
      } else {
        setControllerError(result.error || 'Failed to initialize parent organization');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize parent organization';
      setControllerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateChild = async () => {
    if (!pageController.isRegistered || !parentOrg) {
      setControllerError("Cannot create child: No organization context");
      return;
    }

    setIsProcessing(true);
    setControllerError('');
    
    try {
      const result = await pageController.executeAction('createChildOrg', {
        ...createFormData,
        parentOrgId: parentOrg.id
      });
      
      if (result.success) {
        toast.success(result.message || 'Child organization created successfully');
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
      } else {
        setControllerError(result.error || 'Failed to create child organization');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create child organization';
      setControllerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLifecycleAction = async () => {
    if (!selectedOrg || !lifecycleAction || !pageController.isRegistered) return;

    setIsProcessing(true);
    setControllerError('');
    
    try {
      const result = await pageController.executeAction('updateOrgLifecycle', {
        organizationId: selectedOrg.id,
        action: lifecycleAction,
        reason: lifecycleReason
      });
      
      if (result.success) {
        toast.success(result.message || `Organization ${lifecycleAction} completed successfully`);
        setIsLifecycleOpen(false);
        setLifecycleAction('');
        setLifecycleReason('');
        fetchChildOrgs();
      } else {
        setControllerError(result.error || `Failed to ${lifecycleAction} organization`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${lifecycleAction} organization`;
      setControllerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedOrg || !newOwnerEmail || !pageController.isRegistered) return;

    setIsProcessing(true);
    setControllerError('');
    
    try {
      const result = await pageController.executeAction('transferOwnership', {
        organizationId: selectedOrg.id,
        newOwnerEmail
      });
      
      if (result.success) {
        toast.success(result.message || 'Organization ownership transferred successfully');
        setIsTransferOpen(false);
        setNewOwnerEmail('');
        fetchChildOrgs();
      } else {
        setControllerError(result.error || 'Failed to transfer ownership');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer ownership';
      setControllerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchChildOrgs();
  };

  const handleRefresh = async () => {
    if (!pageController.isRegistered) {
      setControllerError("Cannot refresh: Page controller not registered");
      return;
    }
    
    setControllerError('');
    await checkParentOrg();
    if (parentOrg) {
      await fetchChildOrgs();
    }
    toast.success('Data refreshed successfully');
  };

  // Event handlers for child components
  const handleViewOrg = (org: ChildOrg) => {
    // TODO: Implement view organization details
    console.log('View org:', org);
  };

  const handleEditOrg = (org: ChildOrg) => {
    // TODO: Implement edit organization
    console.log('Edit org:', org);
  };

  const handleLifecycleActionClick = (org: ChildOrg, action: string) => {
    setSelectedOrg(org);
    setLifecycleAction(action);
    setIsLifecycleOpen(true);
  };

  const handleTransferOwnershipClick = (org: ChildOrg) => {
    setSelectedOrg(org);
    setIsTransferOpen(true);
  };

  const handleCancelLifecycleAction = () => {
    setIsLifecycleOpen(false);
    setLifecycleAction('');
    setLifecycleReason('');
    setSelectedOrg(null);
  };

  const handleCancelTransferOwnership = () => {
    setIsTransferOpen(false);
    setNewOwnerEmail('');
    setSelectedOrg(null);
  };

  // Permission check - early return if no access
  if (!canManageOrgs) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access organization lifecycle management. This feature requires system admin or organization admin privileges.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (loading && !parentOrg) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Lifecycle Management</h1>
          <p className="text-muted-foreground">
            Manage parent and child organizations, lifecycle states, and ownership transfers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pageController.isRegistered && (
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {pageController.getAvailableActions().length} AI actions
            </Badge>
          )}
          <Button onClick={handleRefresh} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {controllerError && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          <p className="font-medium">Error</p>
          <p className="text-sm">{controllerError}</p>
        </div>
      )}

      {/* No parent org state */}
      {!parentOrg ? (
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
              <Button onClick={() => setIsInitializeOpen(true)} disabled={!isSystemAdmin}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Initialize Parent Organization
              </Button>
              {!isSystemAdmin && (
                <p className="text-sm text-muted-foreground mt-2">
                  Only system administrators can initialize the parent organization.
                </p>
              )}
            </CardContent>
          </Card>

          <InitializeParentDialog
            isOpen={isInitializeOpen}
            onOpenChange={setIsInitializeOpen}
            formData={initFormData}
            onFormDataChange={setInitFormData}
            onSubmit={handleInitializeParent}
            isProcessing={isProcessing}
          />
        </div>
      ) : (
        // Main component with parent org
        <>
          <ParentOrgCard parentOrg={parentOrg} />

          <ChildOrgsList
            childOrgs={childOrgs}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onSearch={handleSearch}
            onCreateChild={() => setIsCreateOpen(true)}
            onViewOrg={handleViewOrg}
            onEditOrg={handleEditOrg}
            onLifecycleAction={handleLifecycleActionClick}
            onTransferOwnership={handleTransferOwnershipClick}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <CreateChildOrgDialog
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            formData={createFormData}
            onFormDataChange={setCreateFormData}
            onSubmit={handleCreateChild}
            isProcessing={isProcessing}
          />

          <LifecycleActionDialog
            isOpen={isLifecycleOpen}
            onOpenChange={setIsLifecycleOpen}
            selectedOrg={selectedOrg}
            lifecycleAction={lifecycleAction}
            lifecycleReason={lifecycleReason}
            onLifecycleReasonChange={setLifecycleReason}
            onSubmit={handleLifecycleAction}
            onCancel={handleCancelLifecycleAction}
            isProcessing={isProcessing}
          />

          <TransferOwnershipDialog
            isOpen={isTransferOpen}
            onOpenChange={setIsTransferOpen}
            selectedOrg={selectedOrg}
            newOwnerEmail={newOwnerEmail}
            onNewOwnerEmailChange={setNewOwnerEmail}
            onSubmit={handleTransferOwnership}
            onCancel={handleCancelTransferOwnership}
            isProcessing={isProcessing}
          />
        </>
      )}
    </div>
  );
}