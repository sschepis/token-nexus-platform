
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, AlertTriangle } from "lucide-react";

const SecuritySettings = () => {
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [is2FASubmitting, setIs2FASubmitting] = useState(false);
  
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const twoFactorForm = useForm({
    defaultValues: {
      enabled2FA: false,
    },
  });

  const handlePasswordChange = async (data: any) => {
    setIsPasswordSubmitting(true);
    
    try {
      // In a real app, this would be an API call
      console.log("Changing password:", data);
      
      // Simple validation
      if (data.newPassword !== data.confirmPassword) {
        toast({
          title: "Error",
          description: "New passwords do not match.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      });
      
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handle2FAToggle = async (data: any) => {
    setIs2FASubmitting(true);
    
    try {
      // In a real app, this would be an API call
      console.log("Toggling 2FA:", data);
      
      toast({
        title: data.enabled2FA ? "2FA Enabled" : "2FA Disabled",
        description: data.enabled2FA 
          ? "Two-factor authentication has been enabled." 
          : "Two-factor authentication has been disabled.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update 2FA settings.",
        variant: "destructive",
      });
      
      // Reset the form to the previous state
      twoFactorForm.reset({
        enabled2FA: !data.enabled2FA,
      });
    } finally {
      setIs2FASubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="flex-1">
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password regularly to keep your account secure.
            </CardDescription>
          </div>
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
            <CardContent className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters long.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={isPasswordSubmitting}>
                {isPasswordSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="flex-1">
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account.
            </CardDescription>
          </div>
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <Form {...twoFactorForm}>
          <form onSubmit={twoFactorForm.handleSubmit(handle2FAToggle)}>
            <CardContent className="space-y-4">
              <FormField
                control={twoFactorForm.control}
                name="enabled2FA"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Enable Two-Factor Authentication
                      </FormLabel>
                      <FormDescription>
                        Receive a verification code via SMS or authenticator app when signing in.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {twoFactorForm.watch("enabled2FA") && (
                <div className="rounded-md bg-muted p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium">
                        Setup required
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You need to set up an authenticator app to use two-factor authentication.
                        Click the button below to begin setup.
                      </p>
                      <Button variant="outline" className="mt-3" size="sm">
                        Setup 2FA
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={is2FASubmitting}>
                {is2FASubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SecuritySettings;
