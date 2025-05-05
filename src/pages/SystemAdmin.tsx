import React from 'react';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SystemAdmin = () => {
  return (
    <SystemAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
          <p className="text-muted-foreground">
            Manage core system settings, contract deployments, and application bundles.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Select an option from the sidebar to manage system features.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This section provides tools for initial platform setup and ongoing maintenance.</p>
          </CardContent>
        </Card>
      </div>
    </SystemAdminLayout>
  );
};

export default SystemAdmin;