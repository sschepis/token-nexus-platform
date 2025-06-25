import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { DateRange } from "react-day-picker";
import {
  fetchReports,
  generateReport,
  fetchMetrics,
} from "@/store/slices/auditSlice";
import { usePageController } from "@/hooks/usePageController";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";

// Import refactored components
import {
  ReportsHeader,
  OverviewTab,
  UsageTab,
  CustomReportsTab,
} from "@/components/reports";

const ReportsPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const dispatch = useAppDispatch();
  const { 
    reports, 
    isLoadingReports, 
    isGeneratingReport, 
    reportError, 
    metrics, 
    isLoadingMetrics, 
    metricsError 
  } = useAppSelector((state) => state.audit);
  const { currentOrg } = useAppSelector((state) => state.org);

  // State management
  const [timeRange, setTimeRange] = useState("30d");
  const [reportType, setReportType] = useState<'user_activity' | 'token_usage' | 'security_events' | 'organization_summary'>('user_activity');
  const [reportFormat, setReportFormat] = useState<'json' | 'csv' | 'pdf'>('csv');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDateRange, setReportDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [controllerReports, setControllerReports] = useState<any[]>([]);
  const [controllerMetrics, setControllerMetrics] = useState<any>(null);
  const [isLoadingController, setIsLoadingController] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canRead = hasPermission('reports:read');
  const canWrite = hasPermission('reports:write');
  const canReadAnalytics = hasPermission('analytics:read');

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'reports',
    pageName: 'Reports & Analytics',
    description: 'Generate and manage custom reports and analytics',
    category: 'analytics',
    permissions: ['reports:read', 'reports:write', 'analytics:read'],
    tags: ['reports', 'analytics', 'data', 'visualization']
  });

  // Load reports from controller
  const loadReports = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsLoadingController(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('fetchReports', { includeInactive: false });
      
      if (result.success && result.data) {
        const reportsData = result.data as { reports: any[] };
        setControllerReports(reportsData.reports || []);
        toast({
          title: "Reports loaded",
          description: "Reports loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load reports');
        toast({
          title: "Error loading reports",
          description: result.error || 'Failed to load reports',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports');
      toast({
        title: "Error loading reports",
        description: 'Failed to load reports',
        variant: "destructive",
      });
    } finally {
      setIsLoadingController(false);
    }
  };

  // Load metrics from controller
  const loadMetrics = async () => {
    if (!pageController.isRegistered || !canReadAnalytics) return;
    
    try {
      const result = await pageController.executeAction('fetchMetrics', {
        timeRange,
        organizationId: currentOrg?.id
      });
      
      if (result.success && result.data) {
        setControllerMetrics(result.data);
        toast({
          title: "Metrics loaded",
          description: "Metrics loaded successfully",
        });
      } else {
        toast({
          title: "Error loading metrics",
          description: result.error || 'Failed to load metrics',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast({
        title: "Error loading metrics",
        description: 'Failed to load metrics',
        variant: "destructive",
      });
    }
  };

  // Effects
  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadReports();
      if (canReadAnalytics) {
        loadMetrics();
      }
    }
  }, [pageController.isRegistered, canRead, canReadAnalytics]);

  useEffect(() => {
    // Also keep Redux calls for backward compatibility
    dispatch(fetchReports({}));
  }, [dispatch]);

  useEffect(() => {
    if (canReadAnalytics) {
      if (currentOrg?.id) {
        dispatch(fetchMetrics({ timeRange, organizationId: currentOrg.id }));
        if (pageController.isRegistered) {
          loadMetrics();
        }
      } else {
        dispatch(fetchMetrics({ timeRange }));
        if (pageController.isRegistered) {
          loadMetrics();
        }
      }
    }
  }, [timeRange, currentOrg?.id, pageController.isRegistered, canReadAnalytics]);

  // Event handlers
  const handleGenerateReport = async () => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to generate reports",
        variant: "destructive",
      });
      return;
    }

    if (!pageController.isRegistered) {
      toast({
        title: "Controller not available",
        description: "Controller not available",
        variant: "destructive",
      });
      return;
    }

    const startDate = reportDateRange?.from ? format(reportDateRange.from, 'yyyy-MM-dd') : undefined;
    const endDate = reportDateRange?.to ? format(reportDateRange.to, 'yyyy-MM-dd') : undefined;

    try {
      const result = await pageController.executeAction('generateReport', {
        type: reportType,
        format: reportFormat,
        title: reportTitle || `${reportType} Report`,
        startDate,
        endDate,
        filters: {}
      });

      if (result.success) {
        toast({
          title: "Report generated",
          description: "Report generated successfully",
        });
        await loadReports(); // Refresh reports list
      } else {
        toast({
          title: "Error generating report",
          description: result.error || 'Failed to generate report',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error generating report",
        description: 'Failed to generate report',
        variant: "destructive",
      });
    }

    // Also keep Redux call for backward compatibility
    dispatch(
      generateReport({
        type: reportType,
        format: reportFormat,
        startDate,
        endDate,
        filters: {},
      })
    );
  };

  const handleRefreshReports = async () => {
    await loadReports();
    await loadMetrics();
  };

  // Show permission error if user can't read reports
  if (!canRead) {
    return (
      <div className="space-y-6">
        <ReportsHeader
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          onRefresh={handleRefreshReports}
          isLoading={isLoadingController}
          canReadAnalytics={canReadAnalytics}
          canWrite={canWrite}
          pageController={pageController}
        />
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view reports. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportsHeader
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        onRefresh={handleRefreshReports}
        isLoading={isLoadingController}
        canReadAnalytics={canReadAnalytics}
        canWrite={canWrite}
        pageController={pageController}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="grid w-[400px] grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <OverviewTab
          controllerMetrics={controllerMetrics}
          metrics={metrics}
          isLoadingMetrics={isLoadingMetrics}
          metricsError={metricsError}
        />

        <UsageTab
          controllerMetrics={controllerMetrics}
          metrics={metrics}
          isLoadingMetrics={isLoadingMetrics}
          metricsError={metricsError}
        />

        <CustomReportsTab
          reportTitle={reportTitle}
          setReportTitle={setReportTitle}
          reportType={reportType}
          setReportType={setReportType}
          reportFormat={reportFormat}
          setReportFormat={setReportFormat}
          reportDateRange={reportDateRange}
          setReportDateRange={setReportDateRange}
          onGenerateReport={handleGenerateReport}
          isGeneratingReport={isGeneratingReport}
          reportError={reportError}
          canWrite={canWrite}
          controllerReports={controllerReports}
          reports={reports}
          isLoadingReports={isLoadingReports}
          isLoadingController={isLoadingController}
        />
      </Tabs>
    </div>
  );
};

export default ReportsPage;