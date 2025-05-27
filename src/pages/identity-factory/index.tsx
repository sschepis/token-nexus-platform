import React from 'react';
import { IdentityFactoryExplorer } from '@/components/identity/IdentityFactoryExplorer';

const IdentityFactoryPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Identity Factory</h1>
      <IdentityFactoryExplorer />
    </div>
  );
};

export default IdentityFactoryPage;