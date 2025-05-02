
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
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { OrgUser, UserRole, updateUserRole } from "@/store/slices/userSlice";
import { Badge } from "@/components/ui/badge";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";

interface UserRoleManagementProps {
  user: OrgUser | null;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const form = useForm({
    defaultValues: {
      roles: user?.roles || [],
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({ roles: user.roles });
    }
  }, [user, form]);

  const onSubmit = async (data: { roles: UserRole[] }) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // In a real app, this would be an API call
      // await api.updateUserRoles(user.id, data.roles);
      
      // For this mock, we'll just dispatch the Redux action
      dispatch(updateUserRole({ userId: user.id, roles: data.roles }));
      
      toast({
        title: "Roles Updated",
        description: "User roles have been updated successfully",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update roles:", error);
      toast({
        title: "Error",
        description: "Failed to update user roles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Manage User Roles</SheetTitle>
          <SheetDescription>
            Update roles for {user.firstName} {user.lastName}
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <div className="space-y-4">
                    {roleOptions.map((role) => (
                      <FormField
                        key={role.id}
                        control={form.control}
                        name="roles"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={role.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedRoles = checked
                                      ? [...field.value, role.id]
                                      : field.value.filter((value) => value !== role.id);
                                    field.onChange(updatedRoles);
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  {role.label}
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  {role.description}
                                </p>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
            
            <SheetFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export default UserRoleManagement;
