import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import MetricsCards from "../MetricsCards";
import TokenActivityChart from "../charts/TokenActivityChart";
import UserActivityChart from "../charts/UserActivityChart";
import PieChartComponent from "../charts/PieChartComponent";
import { ReportMetrics } from "../types";

interface OverviewTabProps {
  controllerMetrics: ReportMetrics | null;
  metrics: ReportMetrics | null;
  isLoadingMetrics: boolean;
  metricsError: string | null;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  controllerMetrics,
  metrics,
  isLoadingMetrics,
  metricsError
}) => {
  const tokenActivityData = metrics?.tokenActivityData || [];
  const userActivityData = metrics?.userActivityData || [];
  const transactionsByTypeData = metrics?.transactionsByTypeData || [];
  const usersByRoleData = metrics?.usersByRoleData || [];

  return (
    <TabsContent value="overview" className="space-y-6">
      <MetricsCards 
        controllerMetrics={controllerMetrics} 
        metrics={metrics} 
      />

      <div className="grid gap-6 md:grid-cols-2">
        <TokenActivityChart
          data={tokenActivityData}
          isLoading={isLoadingMetrics}
          error={metricsError}
        />

        <UserActivityChart
          data={userActivityData}
          isLoading={isLoadingMetrics}
          error={metricsError}
        />

        <PieChartComponent
          title="Transactions by Type"
          description="Distribution of transaction types"
          data={transactionsByTypeData}
          isLoading={isLoadingMetrics}
          error={metricsError}
        />

        <PieChartComponent
          title="Users by Role"
          description="Distribution of user roles"
          data={usersByRoleData}
          isLoading={isLoadingMetrics}
          error={metricsError}
        />
      </div>
    </TabsContent>
  );
};

export default OverviewTab;