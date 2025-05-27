/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppSelector } from "@/store/hooks";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Parse from 'parse';
import { Loader2 } from "lucide-react";

// Define the organization interface
interface Organization {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: Record<string, any>;
  status: string;
  planType: string;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

// Define Zod schema for validation
const orgSettingsSchema = z.object({
  name: z.string().min(2, { message: "Organization name must be at least 2 characters." }),
  description: z.string().optional(),
  logo: z.string().url({ message: "Please enter a valid URL for the logo." }).optional().or(z.literal('')),
  website: z.string().optional(),
  contactEmail: z.string().email({ message: "Please enter a valid email." }).optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }).optional(),
});

type OrgSettingsFormData = z.infer<typeof orgSettingsSchema>;

const OrganizationSettings = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [loading, setLoading] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  const form = useForm<OrgSettingsFormData>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      name: "",
      description: "",
      logo: "",
      website: "",
      contactEmail: "",
      contactPhone: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
      },
    },
  });
  
  // Fetch organization profile on mount
  useEffect(() => {
    const fetchOrgProfile = async () => {
      if (!currentOrg?.id) return;
      
      setLoading(true);
      try {
        const result = await Parse.Cloud.run('getOrganizationProfile', {
          organizationId: currentOrg.id
        });
        
        if (result.success) {
          setOrganization(result.organization);
          // Reset form with fetched data
          form.reset({
            name: result.organization.name || "",
            description: result.organization.description || "",
            logo: result.organization.logo || "",
            website: result.organization.website || "",
            contactEmail: result.organization.contactEmail || "",
            contactPhone: result.organization.contactPhone || "",
            address: result.organization.address || {
              street: "",
              city: "",
              state: "",
              country: "",
              postalCode: "",
            },
          });
        }
      } catch (error) {
        console.error('Error fetching organization profile:', error);
        toast.error('Failed to load organization profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrgProfile();
  }, [currentOrg?.id, form]);

  const onSubmit = async (data: OrgSettingsFormData) => {
    if (!currentOrg?.id) {
      toast.error("Organization ID is missing. Cannot update settings.");
      return;
    }

    setLoading(true);
    try {
      // Update profile
      const profileResult = await Parse.Cloud.run('updateOrganizationProfile', {
        organizationId: currentOrg.id,
        updates: {
          name: data.name,
          description: data.description,
          logo: data.logo,
          website: data.website,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          address: data.address,
        }
      });
      
      if (profileResult.success) {
        toast.success('Organization profile updated successfully');
        
        // Update settings (if any specific settings need to be saved)
        // For now, we'll just handle the profile update
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Loading organization data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!currentOrg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>No organization selected</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please select an organization to manage its settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Update your organization profile and contact information.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Logo URL Field */}
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/logo.png" {...field} />
                  </FormControl>
                  <FormDescription>Enter the URL of your organization's logo.</FormDescription>
                  {field.value && (
                    <div className="mt-2 border rounded-lg p-4 flex items-center justify-center">
                      <img src={field.value} alt="Organization Logo Preview" className="max-h-20" />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
            
            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell us about your organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website Field */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Contact Email Field */}
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input placeholder="contact@example.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Contact Phone Field */}
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Address Fields */}
            <div className="space-y-4">
              <Label>Address</Label>
              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="10001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={form.formState.isSubmitting || loading}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default OrganizationSettings;
