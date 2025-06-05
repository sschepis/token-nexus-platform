
import React, { useEffect, useState } from "react";
import Parse from 'parse';
import { useAppDispatch, useAppSelector } from "@/store/hooks"; // Import Redux hooks
import { fetchOrgUsers, removeUserFromOrganization, OrgUser } from "@/store/slices/userSlice"; // Import new actions and type
import { KycStatus, UserRole } from "@/store/slices/userSlice"; // Keep these if still used by UI helpers
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
import { toast as sonnerToast } from "sonner"; // Assuming sonner is used project-wide
import UserInviteDialog from "@/components/user/UserInviteDialog";
import UserRoleManagement from "@/components/user/UserRoleManagement";
import UserDetailView from "@/components/user/UserDetailView";
import { usePageController, useDataAction, useUIAction, useNavigationAction } from "@/hooks/usePageController";

const Users = () => {
  const dispatch = useAppDispatch();
  const { orgUsers, isLoading, error } = useAppSelector((state) => state.user);
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  
  // Use currentOrg.id if available, otherwise fall back to authOrgId
  const effectiveOrgId = currentOrg?.id || authOrgId;

  const [searchTerm, setSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);

  // Register page with controller registry
  const pageController = usePageController({
    pageId: 'users',
    pageName: 'User Management',
    description: 'Manage organization users, roles, and permissions. View user details, invite new users, and administer user access.',
    category: 'user-management',
    permissions: ['organization-admin', 'organization-member'],
    tags: ['users', 'administration', 'permissions', 'organization']
  });

  useEffect(() => {
    console.log('Users page - currentOrg:', currentOrg);
    console.log('Users page - authOrgId:', authOrgId);
    console.log('Users page - effectiveOrgId:', effectiveOrgId);
    if (effectiveOrgId) {
      console.log('Dispatching fetchOrgUsers with orgId:', effectiveOrgId);
      dispatch(fetchOrgUsers({ orgId: effectiveOrgId }));
    } else {
      console.log('No effective orgId available, cannot fetch users');
    }
  }, [dispatch, effectiveOrgId, authOrgId, currentOrg]);

  const filteredUsers = (orgUsers || []).filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}` // Handle potentially undefined names
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    console.log('Users page - orgUsers:', orgUsers);
    console.log('Users page - isLoading:', isLoading);
    console.log('Users page - error:', error);
    if (error) {
        sonnerToast.error(`Failed to load users: ${error}`);
    }
  }, [orgUsers, isLoading, error]);

  // Data Actions for Controller Registry
  const fetchUsersAction = useDataAction(
    pageController,
    'fetch-users',
    'Fetch Organization Users',
    'Retrieve all users in the current organization with their roles and status',
    async (params) => {
      const orgId = (params.orgId as string) || effectiveOrgId;
      if (!orgId) {
        throw new Error('No organization ID provided');
      }
      
      const result = await dispatch(fetchOrgUsers({ orgId }));
      const users = Array.isArray(result.payload) ? result.payload : [];
      return {
        users,
        total: users.length,
        message: 'Users fetched successfully'
      };
    },
    [
      {
        name: 'orgId',
        type: 'string',
        required: false,
        description: 'Organization ID (defaults to current organization)',
        defaultValue: currentOrg?.id
      }
    ],
    ['organization-admin', 'organization-member']
  );

  const removeUserAction = useDataAction(
    pageController,
    'remove-user',
    'Remove User from Organization',
    'Remove a user from the current organization (requires confirmation)',
    async (params) => {
      const userId = params.userId as string;
      const reason = params.reason as string;
      const orgId = effectiveOrgId;
      
      if (!orgId) {
        throw new Error('No organization context available');
      }
      
      const user = orgUsers?.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      await dispatch(removeUserFromOrganization({ orgId, userId }));
      
      return {
        message: `User ${user.firstName} ${user.lastName} has been removed from the organization`,
        removedUser: user,
        reason: reason || 'No reason provided'
      };
    },
    [
      {
        name: 'userId',
        type: 'string',
        required: true,
        description: 'ID of the user to remove from the organization'
      },
      {
        name: 'reason',
        type: 'string',
        required: false,
        description: 'Reason for removing the user (for audit log)'
      }
    ],
    ['organization-admin']
  );

  // UI Actions for Controller Registry
  const searchUsersAction = useUIAction(
    pageController,
    'search-users',
    'Search Users',
    'Filter the user list based on search criteria like name or email',
    (params) => {
      const { searchTerm: term } = params;
      setSearchTerm(term as string || '');
    },
    [
      {
        name: 'searchTerm',
        type: 'string',
        required: false,
        description: 'Search term to filter users by name or email',
        defaultValue: ''
      }
    ],
    ['organization-admin', 'organization-member']
  );

  const openInviteDialogAction = useUIAction(
    pageController,
    'open-invite-dialog',
    'Open User Invite Dialog',
    'Show the dialog to invite a new user to the organization',
    () => {
      setInviteDialogOpen(true);
    },
    [],
    ['organization-admin']
  );

  const openUserDetailAction = useUIAction(
    pageController,
    'open-user-detail',
    'Open User Detail View',
    'Show detailed information about a specific user',
    (params) => {
      const { userId } = params;
      const user = orgUsers?.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        setUserDetailOpen(true);
      } else {
        throw new Error('User not found');
      }
    },
    [
      {
        name: 'userId',
        type: 'string',
        required: true,
        description: 'ID of the user to view details for'
      }
    ],
    ['organization-admin', 'organization-member']
  );

  const openRoleManagementAction = useUIAction(
    pageController,
    'open-role-management',
    'Open Role Management',
    'Show the role management interface for a specific user',
    (params) => {
      const { userId } = params;
      const user = orgUsers?.find(u => u.id === userId);
      if (user) {
        setSelectedUser(user);
        setRoleManagementOpen(true);
      } else {
        throw new Error('User not found');
      }
    },
    [
      {
        name: 'userId',
        type: 'string',
        required: true,
        description: 'ID of the user to manage roles for'
      }
    ],
    ['organization-admin']
  );

  // Navigation Actions
  const navigateToUserDetail = useNavigationAction(
    pageController,
    'navigate-to-user-detail',
    'Navigate to User Detail Page',
    'Navigate to a dedicated user detail page',
    '', // Will be set dynamically
    ['organization-admin', 'organization-member']
  );

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

  const getRoleBadges = (roles: string[]) => { // Roles are now string[] from orgRoles
    return (roles || []).map((role) => {
      // Extract base role name if it's like 'editor_ORGID'
      const displayRole = role.includes(`_${currentOrg?.id}`)
        ? role.substring(0, role.lastIndexOf(`_${currentOrg?.id}`))
        : role;

      const variant =
        displayRole === "org_admin" || displayRole === "admin" // Assuming 'admin' might be a base role name
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
    try {
      await fetchUsersAction({ orgId: effectiveOrgId });
      sonnerToast.success("User list refreshed successfully");
    } catch (error) {
      sonnerToast.error("Failed to refresh user list");
      console.error('Refresh users error:', error);
    }
  };
  
  const handleRemoveUser = (userIdToRemove: string) => {
    if (!effectiveOrgId) {
        sonnerToast.error("Cannot remove user: No organization context.");
        return;
    }
    
    const user = orgUsers?.find(u => u.id === userIdToRemove);
    const userName = user ? `${user.firstName} ${user.lastName}` : userIdToRemove;
    
    // Add confirmation dialog here if desired
    sonnerToast.warning(`Are you sure you want to remove ${userName} from this organization? This action cannot be undone.`, {
        action: {
            label: "Confirm Remove",
            onClick: async () => {
              try {
                await removeUserAction({ userId: userIdToRemove, reason: 'Removed by admin' });
                sonnerToast.success(`${userName} has been removed from the organization`);
              } catch (error) {
                sonnerToast.error("Failed to remove user");
                console.error('Remove user error:', error);
              }
            },
        },
        cancel: {
            label: "Cancel",
            onClick: () => {},
        }
    });
  };

  // Debug function to check user setup
  const handleDebugUserSetup = async () => {
    try {
      const result = await Parse.Cloud.run('debugUserOrgSetup', { orgId: effectiveOrgId });
      console.log('Debug User Setup:', result);
      sonnerToast.info('Debug info logged to console. Check browser console for details.');
    } catch (error) {
      console.error('Debug error:', error);
      sonnerToast.error('Debug failed: ' + (error as Error).message);
    }
  };

  // handleInviteSuccess can be removed if UserInviteDialog dispatches fetchOrgUsers on success
  // or if inviteUserToOrganization thunk handles re-fetching.

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
            <Button onClick={() => openInviteDialogAction()} size="sm">
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
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    searchUsersAction({ searchTerm: value });
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
                            <DropdownMenuItem onClick={() => openUserDetailAction({ userId: user.id })}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRoleManagementAction({ userId: user.id })}>
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
                      {searchTerm ? (
                        <div className="text-muted-foreground">
                          No users found matching "{searchTerm}"
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
