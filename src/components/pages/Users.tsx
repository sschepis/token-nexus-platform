import React, { useEffect, useState } from "react";
import { usersApi } from '@/services/api/users';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrgUsers, removeUserFromOrganization, OrgUser } from "@/store/slices/userSlice";
import { KycStatus, UserRole } from "@/store/slices/userSlice";
import { isParseReady } from "@/utils/parseUtils";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  RefreshCw,
  Users as UsersIcon,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserInviteDialog from "@/components/user/UserInviteDialog";
import UserRoleManagement from "@/components/user/UserRoleManagement";
import UserDetailView from "@/components/user/UserDetailView";

const Users = () => {
  const dispatch = useAppDispatch();
  const { orgUsers, isLoading, error } = useAppSelector((state) => state.user);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  
  const effectiveOrgId = currentOrg?.id || authOrgId;

  // Use modern page controller integration
  const pageController = usePageController({
    pageId: 'users',
    pageName: 'User Management',
    description: 'Manage organization users, roles, and permissions. View user details, invite new users, and administer user access.',
    category: 'user-management',
    permissions: ['organization-admin', 'organization-member'],
    tags: ['users', 'administration', 'permissions', 'organization']
  });
  const canManageUsers = usePermission();
  const canInviteUsers = usePermission();
  const { toast } = useToast();

  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllerError, setControllerError] = useState<string | null>(null);
  const [parseReady, setParseReady] = useState(false);

  // Check Parse readiness periodically
  useEffect(() => {
    const checkParseReadiness = () => {
      const ready = isParseReady();
      setParseReady(ready);
      
      if (!ready) {
        // Check again in 500ms if Parse isn't ready
        setTimeout(checkParseReadiness, 500);
      }
    };
    
    checkParseReadiness();
  }, []);

  useEffect(() => {
    console.log('Users page - currentOrg:', currentOrg);
    console.log('Users page - authOrgId:', authOrgId);
    console.log('Users page - effectiveOrgId:', effectiveOrgId);
    console.log('Users page - Parse ready:', parseReady);
    
    if (effectiveOrgId && parseReady) {
      console.log('Dispatching fetchOrgUsers with orgId:', effectiveOrgId);
      dispatch(fetchOrgUsers({ orgId: effectiveOrgId }));
    } else if (effectiveOrgId && !parseReady) {
      console.log('Parse not ready yet, waiting before fetching users');
    } else {
      console.log('No effective orgId available, cannot fetch users');
    }
  }, [dispatch, effectiveOrgId, parseReady]);

  const runSearchAction = async (term: string) => {
    if (!pageController.isRegistered) return;
    
    try {
      await pageController.executeAction('searchUsers', { query: term });
    } catch (error) {
      console.error('Search action failed:', error);
    }
  };

  const filteredUsers = (orgUsers || []).filter(
    (user) =>
      user.email.toLowerCase().includes(localSearchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`
        .toLowerCase()
        .includes(localSearchTerm.toLowerCase())
  );
  
  useEffect(() => {
    console.log('Users page - orgUsers:', orgUsers);
    console.log('Users page - isLoading:', isLoading);
    console.log('Users page - error:', error);
    if (error) {
        setControllerError(`Failed to load users: ${error}`);
    }
  }, [orgUsers, isLoading, error]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getKycStatusBadge = (status: KycStatus) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500">Verified</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadges = (roles: string[]) => {
    return (roles || []).map((role) => {
      const displayRole = role.includes(`_${currentOrg?.id}`)
        ? role.substring(0, role.lastIndexOf(`_${currentOrg?.id}`))
        : role;

      const variant =
        displayRole === "org_admin" || displayRole === "admin"
          ? "default"
          : displayRole === "token_manager" || displayRole === "editor"
          ? "secondary"
          : "outline";

      return (
        <Badge key={role} variant={variant} className="mr-1 capitalize">
          {displayRole.replace("_", " ")}
        </Badge>
      );
    });
  };

  const handleOpenUserDetail = (user: OrgUser) => {
    setSelectedUser(user);
    setUserDetailOpen(true);
  };

  const handleOpenRoleManagement = () => {
    setUserDetailOpen(false);
    setRoleManagementOpen(true);
  };

  const handleRefreshUsers = async () => {
    if (!pageController.isRegistered || !effectiveOrgId) {
      setControllerError("Cannot refresh: No organization context");
      return;
    }
    
    setIsRefreshing(true);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('viewUsers', { orgId: effectiveOrgId });
      if (result.success) {
        toast({
          title: "Success",
          description: "User list refreshed successfully",
        });
        // Refresh the Redux store as well
        dispatch(fetchOrgUsers({ orgId: effectiveOrgId }));
      } else {
        setControllerError(`Failed to refresh user list: ${result.error}`);
        console.error('Refresh users error:', result.error);
      }
    } catch (error) {
      setControllerError("Failed to refresh user list");
      console.error('Refresh users error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleRemoveUser = async (userIdToRemove: string) => {
    if (!canManageUsers) {
      setControllerError('You do not have permission to remove users');
      return;
    }

    if (!effectiveOrgId) {
        setControllerError("Cannot remove user: No organization context.");
        return;
    }
    
    const user = orgUsers?.find(u => u.id === userIdToRemove);
    const userName = user ? `${user.firstName} ${user.lastName}` : userIdToRemove;
    
    // Use browser confirm for now - in a real app you'd use a proper dialog
    if (confirm(`Are you sure you want to remove ${userName} from this organization? This action cannot be undone.`)) {
      try {
        if (pageController.isRegistered) {
          const result = await pageController.executeAction('removeUser', {
            userId: userIdToRemove,
            reason: 'Removed by admin'
          });
          if (result.success) {
            toast({
              title: "Success",
              description: `${userName} has been removed from the organization`,
            });
            dispatch(removeUserFromOrganization({ userId: userIdToRemove, orgId: effectiveOrgId }));
          } else {
            setControllerError(`Failed to remove user: ${result.error}`);
            console.error('Remove user error:', result.error);
          }
        } else {
          dispatch(removeUserFromOrganization({ userId: userIdToRemove, orgId: effectiveOrgId }));
          toast({
            title: "Success",
            description: `${userName} has been removed from the organization`,
          });
        }
      } catch (error) {
        setControllerError("Failed to remove user");
        console.error('Remove user error:', error);
      }
    }
  };

  // Debug function to check user setup
  const handleDebugUserSetup = async () => {
    try {
      const response = await usersApi.debugUserOrgSetup(effectiveOrgId);
      if (response.success) {
        console.log('Debug User Setup:', response.data);
        toast({
          title: "Debug Info",
          description: "Debug info logged to console. Check browser console for details.",
        });
      } else {
        throw new Error(response.error || 'Debug failed');
      }
    } catch (error) {
      console.error('Debug error:', error);
      setControllerError('Debug failed: ' + (error as Error).message);
    }
  };
 
  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <UsersIcon className="h-8 w-8" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground mt-1">
                  Manage users and permissions for {currentOrg?.name || 'your organization'}
                </p>
              </div>
            </div>
          </div>

          {controllerError && (
            <div className="bg-destructive/15 text-destructive px-4 py-2 rounded-md">
              {controllerError}
            </div>
          )}

          <div className="flex items-center gap-2">
            {pageController.isRegistered && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {pageController.getAvailableActions().length} AI actions
                </Badge>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDebugUserSetup}
              className="bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100"
            >
              🐛 Debug
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshUsers}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={localSearchTerm}
                  onChange={(e) => {
                    setLocalSearchTerm(e.target.value);
                    runSearchAction(e.target.value);
                  }}
                  className="pl-8"
                />
              </div>

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">
                    <div className="flex items-center">
                      User
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={index}>
                        {Array(7)
                          .fill(0)
                          .map((_, cellIndex) => (
                            <TableCell key={cellIndex}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                      </TableRow>
                    ))
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>
                              {user.firstName?.[0]}
                              {user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.isActive ? (
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-gray-300"></span>
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadges(user.orgRoles)}</TableCell>
                      <TableCell>{user.kycStatus ? getKycStatusBadge(user.kycStatus) : <Badge variant="outline">N/A</Badge>}</TableCell>
                      <TableCell>
                        {/* {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}  // lastLoginAt not in current OrgUser type from cloud fn */}
                        N/A
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenUserDetail(user)}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              setRoleManagementOpen(true);
                            }}>
                              Manage roles
                            </DropdownMenuItem>
                            {/* <DropdownMenuItem>Reset password</DropdownMenuItem> */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveUser(user.id)}
                            >
                                Remove from Organization
                            </DropdownMenuItem>
                            {/* Suspend/Reactivate would be global actions, handled in GlobalUserManager perhaps */}
                            {/* {user.isActive ? (
                              <DropdownMenuItem className="text-destructive">
                                Suspend user
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem>Reactivate user</DropdownMenuItem>
                            )} */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {localSearchTerm ? (
                        <div className="text-muted-foreground">
                          No users found matching "{localSearchTerm}"
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          No users found. Invite your first user to get started.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* User Invite Dialog */}
        <UserInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          // onInviteSuccess prop might no longer be needed if thunk handles refresh
          // onInviteSuccess={handleInviteSuccess}
        />

        {/* User Role Management */}
        <UserRoleManagement
          user={selectedUser}
          open={roleManagementOpen}
          onOpenChange={setRoleManagementOpen}
        />

        {/* User Detail View */}
        <UserDetailView
          user={selectedUser}
          open={userDetailOpen}
          onOpenChange={setUserDetailOpen}
          onManageRoles={handleOpenRoleManagement}
        />
      </div>
  );
};

export default Users;
