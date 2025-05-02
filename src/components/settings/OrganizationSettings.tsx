
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAppDispatch } from "@/store/hooks";
import { updateOrgTheme, updateOrgLogo } from "@/store/slices/orgSlice";
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
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Organization } from "@/store/slices/orgSlice";

interface OrganizationSettingsProps {
  organization: Organization;
}

const OrganizationSettings = ({ organization }: OrganizationSettingsProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  
  const form = useForm({
    defaultValues: {
      name: organization.name,
      domain: organization.domain || "",
      primaryColor: organization.primaryColor || "#9b87f5",
      secondaryColor: organization.secondaryColor || "#7E69AB",
      logo: organization.logo || "",
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    
    try {
      // In a real app, this would be an API call
      // For now, we'll just update the Redux store
      
      // Update organization theme colors
      dispatch(
        updateOrgTheme({
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
        })
      );
      
      // Update organization logo if changed
      if (data.logo !== organization.logo) {
        dispatch(updateOrgLogo(data.logo));
      }
      
      toast({
        title: "Organization Updated",
        description: "Organization settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization settings.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Update your organization profile and branding.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label>Organization Logo</Label>
              <div className="mt-2 border rounded-lg p-4 flex items-center justify-center">
                {organization.logo ? (
                  <img 
                    src={organization.logo} 
                    alt="Organization Logo" 
                    className="max-h-20" 
                  />
                ) : (
                  <div className="h-20 w-full flex items-center justify-center bg-muted rounded-md">
                    <p className="text-muted-foreground">No logo</p>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <Button variant="outline" size="sm">
                  Upload Logo
                </Button>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Organization Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="yourdomain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label>Brand Colors</Label>
              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="w-8 h-8 rounded-full border"
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <div className="flex gap-2">
                        <div 
                          className="w-8 h-8 rounded-full border"
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input type="text" {...field} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default OrganizationSettings;
