import React from 'react';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const AppBundles = () => {
  return (
    <SystemAdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Application Bundle Management</CardTitle>
          <CardDescription>Manage application bundles available in the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Uploading, versioning, and managing app bundles provided to organizations will be handled here.</p>
          {/* TODO: Implement app bundle management UI */}
        </CardContent>
      </Card>
    </SystemAdminLayout>
  );
};

export default AppBundles;