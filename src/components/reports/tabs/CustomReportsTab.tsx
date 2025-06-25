import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReportBuilder from "../ReportBuilder";
import ReportsTable from "../ReportsTable";
import { DateRange } from "react-day-picker";

interface CustomReportsTabProps {
  reportTitle: string;
  setReportTitle: (value: string) => void;
  reportType: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary';
  setReportType: (value: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary') => void;
  reportFormat: 'json' | 'csv' | 'pdf';
  setReportFormat: (value: 'json' | 'csv' | 'pdf') => void;
  reportDateRange: DateRange | undefined;
  setReportDateRange: (value: DateRange | undefined) => void;
  onGenerateReport: () => Promise<void>;
  isGeneratingReport: boolean;
  reportError: string | null;
  canWrite: boolean;
  controllerReports: any[];
  reports: any[];
  isLoadingReports: boolean;
  isLoadingController: boolean;
}

const CustomReportsTab: React.FC<CustomReportsTabProps> = ({
  reportTitle,
  setReportTitle,
  reportType,
  setReportType,
  reportFormat,
  setReportFormat,
  reportDateRange,
  setReportDateRange,
  onGenerateReport,
  isGeneratingReport,
  reportError,
  canWrite,
  controllerReports,
  reports,
  isLoadingReports,
  isLoadingController
}) => {
  const displayReports = controllerReports.length > 0 ? controllerReports : reports;
  const isLoading = isLoadingReports || isLoadingController;

  return (
    <TabsContent value="custom" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
          <CardDescription>Create and save custom reports based on your specific needs</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportBuilder
            reportTitle={reportTitle}
            setReportTitle={setReportTitle}
            reportType={reportType}
            setReportType={setReportType}
            reportFormat={reportFormat}
            setReportFormat={setReportFormat}
            reportDateRange={reportDateRange}
            setReportDateRange={setReportDateRange}
            onGenerateReport={onGenerateReport}
            isGeneratingReport={isGeneratingReport}
            reportError={reportError}
            canWrite={canWrite}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past Reports</CardTitle>
          <CardDescription>Recently generated reports available for download</CardDescription>
        </CardHeader>
        <CardContent>
          <ReportsTable
            reports={displayReports}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popular Reports</CardTitle>
          <CardDescription>Quick access to frequently used report templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="w-full">User Activity Summary</Button>
            <Button variant="outline" className="w-full">Token Transaction Log</Button>
            <Button variant="outline" className="w-full">Security Event Overview</Button>
            <Button variant="outline" className="w-full">Organization Usage Report</Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default CustomReportsTab;