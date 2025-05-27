
import React, { useEffect, useState } from "react";
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

const Users = () => {
  const dispatch = useAppDispatch();
  const { orgUsers, isLoading, error } = useAppSelector((state) => state.user);
  const { currentOrg } = useAppSelector((state) => state.org);

  const [searchTerm, setSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [roleManagementOpen, setRoleManagementOpen] = useState(false);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrgUser | null>(null);

  useEffect(() => {
    if (currentOrg?.id) {
      dispatch(fetchOrgUsers({ orgId: currentOrg.id }));
    }
  }, [dispatch, currentOrg?.id]);

  const filteredUsers = (orgUsers || []).filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}` // Handle potentially undefined names
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    if (error) {
        sonnerToast.error(`Failed to load users: ${error}`);
    }
  }, [error]);

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

  const handleRefreshUsers = () => {
    if (currentOrg?.id) {
      dispatch(fetchOrgUsers({ orgId: currentOrg.id }));
      sonnerToast.info("Refreshing user list...");
    } else {
      sonnerToast.warning("No organization selected to refresh users for.");
    }
  };
  
  const handleRemoveUser = (userIdToRemove: string) => {
    if (!currentOrg?.id) {
        sonnerToast.error("Cannot remove user: No organization context.");
        return;
    }
    if (selectedUser?.id === userIdToRemove && userIdToRemove === selectedUser?.id /* TODO: check if it's current logged in user */) {
        // sonnerToast.error("You cannot remove yourself.");
        // return;
    }
    // Add confirmation dialog here if desired
    sonnerToast.warning(`Are you sure you want to remove user ${userIdToRemove} from this organization? This action cannot be undone.`, {
        action: {
            label: "Confirm Remove",
            onClick: () => dispatch(removeUserFromOrganization({ orgId: currentOrg.id, userId: userIdToRemove })),
        },
        cancel: {
            label: "Cancel",
            onClick: () => {},
        }
    });
  };

  // handleInviteSuccess can be removed if UserInviteDialog dispatches fetchOrgUsers on success
  // or if inviteUserToOrganization thunk handles re-fetching.

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage users and permissions for your organization
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshUsers}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
