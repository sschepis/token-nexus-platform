import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportMetrics } from "./types";

interface MetricsCardsProps {
  controllerMetrics: ReportMetrics | null;
  metrics: ReportMetrics | null;
}

const MetricsCards: React.FC<MetricsCardsProps> = ({ controllerMetrics, metrics }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{controllerMetrics?.totalTokens || metrics?.totalTokens || '3'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {controllerMetrics?.tokenChange || metrics?.tokenChange || '+1 from last period'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{controllerMetrics?.activeUsers || metrics?.activeUsers || '62'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {controllerMetrics?.userChange || metrics?.userChange || '+5 from last period'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">API Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{controllerMetrics?.apiCalls || metrics?.apiCalls || '1,248'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {controllerMetrics?.apiChange || metrics?.apiChange || '+15% from last period'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{controllerMetrics?.transactionVolume || metrics?.transactionVolume || '$141,000'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {controllerMetrics?.volumeChange || metrics?.volumeChange || '+8% from last period'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsCards;