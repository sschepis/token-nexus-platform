import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { ThemeManagement } from '@/theming/components/ThemeManagement/ThemeManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Sparkles } from 'lucide-react';

const Theme = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  
  // Use currentOrg.id if available, otherwise fall back to authOrgId
  const effectiveOrgId = currentOrg?.id || authOrgId;

  if (!effectiveOrgId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Theme Management</h1>
            <p className="text-muted-foreground">
              Customize your organization's visual appearance and branding
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Organization Required
            </CardTitle>
            <CardDescription>
              Please select an organization to manage themes and branding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Theme management requires an active organization context. 
              Please ensure you're logged in and have access to an organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Theme Management</h1>
          <p className="text-muted-foreground">
            Customize your organization's visual appearance and branding
          </p>
        </div>
      </div>

      <ThemeManagement 
        organizationId={effectiveOrgId}
        className="w-full"
      />
    </div>
  );
};

export default Theme;