/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "@/store/hooks"; // Import Redux hooks
import { inviteUserToOrganization } from "@/store/slices/userSlice"; // Import new thunk
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
// import { toast } from "@/hooks/use-toast"; // Using sonner directly
import { toast as sonnerToast } from "sonner";
// import { mockApis } from "@/services/api"; // No longer using mockApis
import { UserRole } from "@/store/slices/userSlice"; // UserRole might be used for available roles in dropdown

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSuccess?: () => void; // This might become redundant as thunk handles refresh
}

// Schema updated: removed firstName and lastName as inviteUserToOrg primarily uses email and roles.
// The cloud function assumes user exists or will be created via platform sign-up.
const userInviteSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(["org_admin", "developer", "viewer", "token_manager"]), // These are base role names
});

type UserInviteFormValues = z.infer<typeof userInviteSchema>;

export function UserInviteDialog({
  open,
  onOpenChange,
  onInviteSuccess, // Kept for now, but thunk handles refresh
}: UserInviteDialogProps) {
  const dispatch = useAppDispatch();
  const { currentOrg } = useAppSelector((state) => state.org);

  const form = useForm<UserInviteFormValues>({
    resolver: zodResolver(userInviteSchema),
    defaultValues: {
      email: "",
      role: "viewer", // Default role
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (data: UserInviteFormValues) => {
    if (!currentOrg?.id) {
      sonnerToast.error("No organization selected. Cannot invite user.");
      return;
    }

    try {
      await dispatch(inviteUserToOrganization({
        orgId: currentOrg.id,
        email: data.email,
        roles: [data.role], // Sending an array with the selected role
      })).unwrap(); // unwrap to catch potential rejections here for more specific error handling if needed

      // Toast success is handled by the thunk now.
      // sonnerToast.success(`Invitation process initiated for ${data.email}.`);
      
      form.reset();
      onOpenChange(false);
      if (onInviteSuccess) { // Call if still needed for other UI updates
        onInviteSuccess();
      }
    } catch (error: any) {
      // Error toast is handled by the thunk now.
      // sonnerToast.error(error?.message || "Failed to send invitation. Please try again.");
      console.error("Failed to invite user (from component):", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) form.reset(); // Reset form if dialog is closed
        onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a new user to join your organization. They will receive an email with instructions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="email@example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* First name and Last name fields removed as per updated strategy */}
            {/* <div className="grid grid-cols-2 gap-4"> ... </div> */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="org_admin">Organization Admin</SelectItem>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="token_manager">Token Manager</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default UserInviteDialog;
