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
  User, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
  Ban,
  CheckCircle,
  Shield,
  Mail,
  Eye,
  Key,
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
  LogIn
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
import { Checkbox } from '@/components/ui/checkbox';

interface GlobalUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isSystemAdmin: boolean;
  isInactive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
    isActive: boolean;
    assignedAt: string;
  }>;
  stats: {
    tokenCount: number;
    organizationCount: number;
  };
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  systemAdmins: number;
  verifiedEmails: number;
  unverifiedEmails: number;
  newUsersThisMonth: number;
  orgDistribution: {
    noOrg: number;
    oneOrg: number;
    multipleOrgs: number;
  };
}

export function GlobalUserManager() {
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<GlobalUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [requirePasswordReset, setRequirePasswordReset] = useState(true);
  
  const [createFormData, setCreateFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    isSystemAdmin: false,
    organizationId: '',
    role: 'member'
  });

  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    isSystemAdmin: false,
    isInactive: false
  });


  const fetchUsers = useCallback(async () => {
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

      if (statusFilter === 'active') {
        params.status = 'active';
      } else if (statusFilter === 'inactive') {
        params.status = 'inactive';
      }
      
      if (searchQuery) {
        params.searchQuery = searchQuery;
      }

      const result = await Parse.Cloud.run('getAllUsers', params);

      if (result.success) {
        setUsers(result.users);
        setTotalPages(result.totalPages);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await Parse.Cloud.run('getUserStats');
      if (result.success) {
        setUserStats(result.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleCreateUser = async () => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('createUserByAdmin', createFormData);
      if (result.success) {
        toast.success(result.message);
        setIsCreateOpen(false);
        setCreateFormData({
          email: '',
          firstName: '',
          lastName: '',
          password: '',
          isSystemAdmin: false,
          organizationId: '',
          role: 'member'
        });
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('updateUserByAdmin', {
        userId: selectedUser.id,
        updates: editFormData
      });
      if (result.success) {
        toast.success(result.message);
        setIsEditOpen(false);
        fetchUsers();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !tempPassword) return;
    
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('resetUserPasswordByAdmin', {
        userId: selectedUser.id,
        newPassword: tempPassword,
        requireReset: requirePasswordReset
      });
      if (result.success) {
        toast.success(result.message);
        setIsPasswordResetOpen(false);
        setTempPassword('');
        setRequirePasswordReset(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (user: GlobalUser) => {
    const newStatus = !user.isInactive;
    const action = newStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('toggleUserStatus', {
        userId: user.id,
        isActive: !newStatus,
        reason: `${action}d by system administrator`
      });
      if (result.success) {
        toast.success(result.message);
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} user`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (user: GlobalUser, hardDelete = false) => {
    const confirmMsg = hardDelete 
      ? 'Are you sure you want to permanently delete this user? This action cannot be undone.'
      : 'Are you sure you want to delete this user?';
    
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('deleteUserByAdmin', {
        userId: user.id,
        hardDelete
      });
      if (result.success) {
        toast.success(result.message);
        fetchUsers();
        fetchStats();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImpersonate = async (user: GlobalUser) => {
    if (!confirm(`Are you sure you want to impersonate ${user.email}?`)) return;

    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('impersonateUser', {
        userId: user.id
      });
      if (result.success) {
        toast.success('Impersonation session created. Opening in new window...');
        
        // Open new window with impersonation session
        const impersonateUrl = `${window.location.origin}/impersonate?token=${result.sessionToken}&userId=${result.userId}`;
        window.open(impersonateUrl, '_blank');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to impersonate user');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (user: GlobalUser) => {
    if (user.isInactive) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <Ban className="h-3 w-3" />
          Inactive
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {userStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {userStats.activeUsers} active, {userStats.inactiveUsers} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Admins</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.systemAdmins}</div>
              <p className="text-xs text-muted-foreground">
                With full platform access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Email Verified</CardTitle>
              <MailCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((userStats.verifiedEmails / userStats.totalUsers) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {userStats.verifiedEmails} of {userStats.totalUsers} users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats.newUsersThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                User registrations
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all users on the platform</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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
                <SelectItem value="inactive">Inactive</SelectItem>
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
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {user.firstName} {user.lastName}
                        {user.isSystemAdmin && (
                          <Badge variant="secondary" className="ml-2">
                            <Shield className="h-3 w-3 mr-1" />
                            System Admin
                          </Badge>
                        )}
                      </h4>
                      {getStatusBadge(user)}
                      {user.emailVerified && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MailCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {user.stats.organizationCount} orgs
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                      {user.lastLogin && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last login {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {user.organizations.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Organizations:</span>
                        {user.organizations.slice(0, 3).map((org) => (
                          <Badge key={org.id} variant="outline" className="text-xs">
                            {org.name} ({org.role})
                          </Badge>
                        ))}
                        {user.organizations.length > 3 && (
                          <span className="text-muted-foreground">
                            +{user.organizations.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setIsDetailOpen(true);
                      }}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setEditFormData({
                          firstName: user.firstName,
                          lastName: user.lastName,
                          email: user.email,
                          isSystemAdmin: user.isSystemAdmin,
                          isInactive: user.isInactive
                        });
                        setIsEditOpen(true);
                      }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user);
                        setIsPasswordResetOpen(true);
                      }}>
                        <Key className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleImpersonate(user)}>
                        <LogIn className="mr-2 h-4 w-4" />
                        Impersonate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                        {user.isInactive ? (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        ) : (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteUser(user)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
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

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={createFormData.firstName}
                  onChange={(e) => setCreateFormData({ ...createFormData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={createFormData.lastName}
                  onChange={(e) => setCreateFormData({ ...createFormData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                placeholder="john.doe@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-admin"
                checked={createFormData.isSystemAdmin}
                onCheckedChange={(checked) => 
                  setCreateFormData({ ...createFormData, isSystemAdmin: checked as boolean })
                }
              />
              <Label htmlFor="is-admin" className="text-sm font-normal">
                Grant system administrator privileges
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first">First Name</Label>
                <Input
                  id="edit-first"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-last">Last Name</Label>
                <Input
                  id="edit-last"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-admin"
                  checked={editFormData.isSystemAdmin}
                  onCheckedChange={(checked) => 
                    setEditFormData({ ...editFormData, isSystemAdmin: checked as boolean })
                  }
                />
                <Label htmlFor="edit-admin" className="text-sm font-normal">
                  System administrator
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-inactive"
                  checked={editFormData.isInactive}
                  onCheckedChange={(checked) => 
                    setEditFormData({ ...editFormData, isInactive: checked as boolean })
                  }
                />
                <Label htmlFor="edit-inactive" className="text-sm font-normal">
                  Mark as inactive
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="require-reset"
                checked={requirePasswordReset}
                onCheckedChange={(checked) => setRequirePasswordReset(checked as boolean)}
              />
              <Label htmlFor="require-reset" className="text-sm font-normal">
                Require user to change password on next login
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPasswordResetOpen(false);
              setTempPassword('');
              setRequirePasswordReset(true);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={!tempPassword || tempPassword.length < 8 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">
                    {selectedUser.email}
                    {selectedUser.emailVerified && (
                      <Badge variant="outline" className="ml-2">Verified</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedUser)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Privileges</Label>
                  <div className="mt-1">
                    {selectedUser.isSystemAdmin ? (
                      <Badge variant="secondary">
                        <Shield className="h-3 w-3 mr-1" />
                        System Admin
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Regular User</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Login</Label>
                  <p className="font-medium">
                    {selectedUser.lastLogin 
                      ? new Date(selectedUser.lastLogin).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {selectedUser.organizations.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Organization Memberships</h4>
                  <div className="space-y-2">
                    {selectedUser.organizations.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Role: {org.role} • Joined {new Date(org.assignedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={org.isActive ? 'default' : 'secondary'}>
                          {org.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Organizations:</span>
                    <span className="ml-2 font-medium">{selectedUser.stats.organizationCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tokens Created:</span>
                    <span className="ml-2 font-medium">{selectedUser.stats.tokenCount}</span>
                  </div>
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