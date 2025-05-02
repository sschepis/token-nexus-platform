
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrgUser, KycStatus } from "@/store/slices/userSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Mail, Calendar, Lock, Unlock, UserCheck, UserX } from "lucide-react";
import { useDispatch } from "react-redux";
import { updateUserStatus } from "@/store/slices/userSlice";
import { AppDispatch } from "@/store/store";
import { toast } from "@/hooks/use-toast";

interface UserDetailViewProps {
  user: OrgUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManageRoles: () => void;
}

export function UserDetailView({
  user,
  open,
  onOpenChange,
  onManageRoles,
}: UserDetailViewProps) {
  const dispatch = useDispatch<AppDispatch>();

  if (!user) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
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

  const handleStatusChange = async (isActive: boolean) => {
    try {
      dispatch(updateUserStatus({ userId: user.id, isActive }));
      toast({
        title: isActive ? "User Activated" : "User Suspended",
        description: `${user.firstName} ${user.lastName} has been ${
          isActive ? "activated" : "suspended"
        } successfully.`,
      });
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle className="text-2xl">User Profile</SheetTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16 border">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-lg">
                {user.firstName?.[0]}
                {user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                {user.firstName} {user.lastName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {user.roles.map((role) => {
              const variant =
                role === "org_admin"
                  ? "default"
                  : role === "token_manager"
                  ? "secondary"
                  : "outline";

              return (
                <Badge key={role} variant={variant} className="capitalize">
                  {role.replace("_", " ")}
                </Badge>
              );
            })}
            {user.isActive ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                Inactive
              </Badge>
            )}
            {getKycStatusBadge(user.kycStatus)}
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
                <CardDescription>Basic user details and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p className="flex items-center mt-1 gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Login</p>
                    <p className="flex items-center mt-1 gap-1.5">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">KYC Status</p>
                  <p className="mt-1">{getKycStatusBadge(user.kycStatus)}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="actions" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manage Roles</CardTitle>
                  <CardDescription>Assign or remove user roles</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Update the user's permissions by changing their role assignments.
                  </p>
                  <Button onClick={onManageRoles} className="w-full">
                    Manage Roles
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Status</CardTitle>
                  <CardDescription>
                    Control user access to the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.isActive ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          <Lock className="mr-2 h-4 w-4" />
                          Suspend User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Suspend User Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to suspend this user? They will
                            no longer be able to access the platform until
                            reactivated.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleStatusChange(false)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Suspend User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Unlock className="mr-2 h-4 w-4" />
                          Activate User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Activate User Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reactivate this user? They will
                            regain access to the platform.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleStatusChange(true)}
                          >
                            Activate User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default UserDetailView;
