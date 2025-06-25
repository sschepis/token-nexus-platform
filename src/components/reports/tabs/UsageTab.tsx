import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import APIUsageChart from "../charts/APIUsageChart";
import PieChartComponent from "../charts/PieChartComponent";
import { ReportMetrics } from "../types";

interface UsageTabProps {
  controllerMetrics: ReportMetrics | null;
  metrics: ReportMetrics | null;
  isLoadingMetrics: boolean;
  metricsError: string | null;
}

const UsageTab: React.FC<UsageTabProps> = ({
  controllerMetrics,
  metrics,
  isLoadingMetrics,
  metricsError
}) => {
  const apiUsageData = metrics?.apiUsageData || [];
  const topEndpoints = controllerMetrics?.topEndpoints || metrics?.topEndpoints || [
    { endpoint: '/api/tokens', calls: 324 },
    { endpoint: '/api/users', calls: 256 },
    { endpoint: '/api/transactions', calls: 189 },
    { endpoint: '/api/dashboard', calls: 145 },
    { endpoint: '/api/settings', calls: 92 }
  ];
  const errorRates = controllerMetrics?.errorRates || metrics?.errorRates || [
    { name: "Success", value: 95 },
    { name: "Client Error", value: 3 },
    { name: "Server Error", value: 2 }
  ];

  return (
    <TabsContent value="usage" className="space-y-6">
      <APIUsageChart
        data={apiUsageData}
        isLoading={isLoadingMetrics}
        error={metricsError}
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top API Endpoints</CardTitle>
            <CardDescription>Most frequently used API endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {topEndpoints.map((item: any, index: number) => (
                <li key={index} className="flex justify-between">
                  <div className="text-sm font-medium">{item.endpoint}</div>
                  <div className="text-sm text-muted-foreground">{item.calls} calls</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <PieChartComponent
          title="Error Rates"
          description="API errors and success rates"
          data={errorRates}
          isLoading={isLoadingMetrics}
          error={metricsError}
          colors={["#4ade80", "#facc15", "#f87171"]}
        />
      </div>
    </TabsContent>
  );
};

export default UsageTab;