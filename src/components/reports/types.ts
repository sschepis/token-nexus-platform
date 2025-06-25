import { DateRange } from "react-day-picker";

export interface ReportMetrics {
  totalTokens?: string | number;
  tokenChange?: string;
  activeUsers?: string | number;
  userChange?: string;
  apiCalls?: string | number;
  apiChange?: string;
  transactionVolume?: string | number;
  volumeChange?: string;
  tokenActivityData?: any[];
  userActivityData?: any[];
  transactionsByTypeData?: any[];
  usersByRoleData?: any[];
  apiUsageData?: any[];
  topEndpoints?: Array<{ endpoint: string; calls: number }>;
  errorRates?: Array<{ name: string; value: number }>;
}

export interface ReportsPageProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
  reportType: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary';
  setReportType: (value: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary') => void;
  reportFormat: 'json' | 'csv' | 'pdf';
  setReportFormat: (value: 'json' | 'csv' | 'pdf') => void;
  reportTitle: string;
  setReportTitle: (value: string) => void;
  reportDateRange: DateRange | undefined;
  setReportDateRange: (value: DateRange | undefined) => void;
  controllerReports: any[];
  controllerMetrics: ReportMetrics | null;
  isLoadingController: boolean;
  error: string | null;
  canRead: boolean;
  canWrite: boolean;
  canReadAnalytics: boolean;
  onGenerateReport: () => Promise<void>;
  onRefreshReports: () => Promise<void>;
}

export interface ChartData {
  [key: string]: any;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  change: string;
}