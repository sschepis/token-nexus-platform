/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage, // Added missing FormMessage import
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
// import { toast } from "@/hooks/use-toast"; // Using sonner directly
import { toast as sonnerToast } from "sonner";
import { OrgUser, UserRole, updateOrgUserRoles } from "@/store/slices/userSlice"; // Import new thunk
import { useAppSelector } from "@/store/hooks"; // To get currentOrg
import { Badge } from "@/components/ui/badge";
import { useDispatch } from "react-redux"; // Keep for AppDispatch type
import { AppDispatch } from "@/store/store";


interface UserRoleManagementProps {
  user: OrgUser | null; // User object, should contain orgRoles
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
}

const roleOptions: RoleOption[] = [
  {
    id: "org_admin",
    label: "Organization Admin",
    description: "Full access to all organization settings and users",
  },
  {
    id: "token_manager",
    label: "Token Manager",
    description: "Can create, modify, and manage tokens",
  },
  {
    id: "developer",
    label: "Developer",
    description: "API access and development tools",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Read-only access to organization resources",
  },
];

export function UserRoleManagement({
  user,
  open,
  onOpenChange,
}: UserRoleManagementProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentOrg } = useAppSelector((state) => state.org);

  // The form will manage an array of selected role IDs (base names like 'org_admin')
  const form = useForm<{ roles: string[] }>({
    defaultValues: {
      roles: user?.orgRoles || [], // Initialize with user's current org-specific roles
    },
  });
  
  const {formState: {isSubmitting}} = form;


  React.useEffect(() => {
    if (user) {
      // user.orgRoles contains full role names like 'editor_ORGID'
      // We need to map these to base role names for the form if roleOptions use base names.
      // Assuming roleOptions.id are base names.
      const baseRoles = user.orgRoles
        .map(fullRoleName => {
          if (currentOrg?.id && fullRoleName.endsWith(`_${currentOrg.id}`)) {
            return fullRoleName.substring(0, fullRoleName.lastIndexOf(`_${currentOrg.id}`));
          }
          // Handle roles that might not follow the _ORGID pattern, or system roles if applicable
          // For now, only consider roles matching the pattern or exact matches in roleOptions
          return roleOptions.find(opt => opt.id === fullRoleName) ? fullRoleName : null;
        })
        .filter(Boolean) as string[];
      form.reset({ roles: baseRoles });
    } else {
      form.reset({ roles: [] });
    }
  }, [user, currentOrg?.id, form]);

  const onSubmit = async (data: { roles: string[] }) => { // data.roles are base role names
    if (!user?.id) {
        sonnerToast.error("User ID is missing.");
        return;
    }
    if (!currentOrg?.id) {
        sonnerToast.error("Organization context is missing.");
        return;
    }
    
    // setIsSubmitting(true); // react-hook-form's formState.isSubmitting handles this

    try {
      await dispatch(updateOrgUserRoles({
        orgId: currentOrg.id,
        userId: user.id,
        roles: data.roles, // Pass the array of selected base role names
      })).unwrap(); // unwrap to catch potential rejections for specific error handling

      // Success toast is handled by the thunk
      onOpenChange(false);
    } catch (error: any) {
      // Error toast is handled by the thunk
      console.error("Failed to update roles (from component):", error);
    }
    // finally { // react-hook-form's formState.isSubmitting handles this
    //   setIsSubmitting(false);
    // }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Manage User Roles</SheetTitle>
          <SheetDescription>
            Update roles for {user.firstName || user.email} {user.lastName || ''}
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roles" // This field now holds an array of selected role IDs (base names)
              render={() => (
                <FormItem>
                  <FormLabel className="text-base">Assign Roles</FormLabel>
                  <div className="space-y-2 pt-2">
                    {roleOptions.map((roleOpt) => ( // Renamed role to roleOpt to avoid conflict
                      <FormField
                        key={roleOpt.id}
                        control={form.control}
                        name="roles"
                        render={({ field }) => {
                          return (
                            <FormItem
                              className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 hover:bg-muted/50"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(roleOpt.id)}
                                  onCheckedChange={(checked) => {
                                    const currentRoles = field.value || [];
                                    const updatedRoles = checked
                                      ? [...currentRoles, roleOpt.id]
                                      : currentRoles.filter((value) => value !== roleOpt.id);
                                    field.onChange(updatedRoles);
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-0.5 leading-none">
                                <FormLabel className="text-sm font-medium cursor-pointer">
                                  {roleOpt.label}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  {roleOpt.description}
                                </p>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <SheetFooter className="pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                    onOpenChange(false);
                    // Optionally reset form if changes shouldn't persist across openings without save
                    // if (user) form.reset({ roles: user.orgRoles.map( /* map to base roles */ ) });
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Role Changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default UserRoleManagement;
