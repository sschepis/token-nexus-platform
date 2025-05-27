import React from 'react';
import { AlchemyAnalytics } from '@/components/system-admin/AlchemyAnalytics';
import SystemAdminLayout from '@/components/system-admin/SystemAdminLayout';

const AlchemyAnalyticsPage: React.FC = () => {
  return (
    <SystemAdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Alchemy Analytics</h1>
        <AlchemyAnalytics />
      </div>
    </SystemAdminLayout>
  );
};

export default AlchemyAnalyticsPage;