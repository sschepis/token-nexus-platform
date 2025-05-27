import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const AlchemyAnalytics: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alchemy Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This page will display Alchemy analytics data for the organization's RPC node.</p>
        <p>Current RPC Node: [Dynamic RPC Node from Organization Settings]</p>
        {/* Placeholder for charts, data, and configuration options */}
      </CardContent>
    </Card>
  );
};