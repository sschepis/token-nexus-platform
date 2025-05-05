import React from 'react';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const ChainConfiguration = () => {
  return (
    <SystemAdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Blockchain Network Configuration</CardTitle>
          <CardDescription>Manage supported EVM chains and deployment settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Chain details (RPC URLs, Chain IDs, etc.) and credential management will be configured here.</p>
          {/* TODO: Implement chain configuration form and list */}
        </CardContent>
      </Card>
    </SystemAdminLayout>
  );
};

export default ChainConfiguration;