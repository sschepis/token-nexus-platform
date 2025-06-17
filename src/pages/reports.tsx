import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Download, CalendarIcon, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchReports,
  generateReport,
  Report,
  AuditEventType,
  fetchMetrics,
} from "@/store/slices/auditSlice";
import { usePageController } from "@/hooks/usePageController";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ReportsPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const dispatch = useAppDispatch();
  const { reports, isLoadingReports, isGeneratingReport, reportError, metrics, isLoadingMetrics, metricsError } = useAppSelector(
    (state) => state.audit
  );
  const { currentOrg } = useAppSelector((state) => state.org);

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
 
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // All chart data now comes from `metrics` state
  const tokenActivityData = metrics?.tokenActivityData || [];
  const userActivityData = metrics?.userActivityData || [];
  const transactionsByTypeData = metrics?.transactionsByTypeData || [];
  const usersByRoleData = metrics?.usersByRoleData || [];
  const apiUsageData = metrics?.apiUsageData || [];


  // Show permission error if user can't read reports
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track platform usage, monitor performance metrics, and visualize data
            </p>
          </div>
        </div>
        
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track platform usage, monitor performance metrics, and visualize data
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleRefreshReports}
              disabled={isLoadingController}
            >
              {isLoadingController ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            {canReadAnalytics && (
              <Select
                value={timeRange}
                onValueChange={(value) => setTimeRange(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            )}
            {canWrite && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>

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

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground mt-1">+1 from last period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">62</div>
                  <p className="text-xs text-muted-foreground mt-1">+5 from last period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">API Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,248</div>
                  <p className="text-xs text-muted-foreground mt-1">+15% from last period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Transaction Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$141,000</div>
                  <p className="text-xs text-muted-foreground mt-1">+8% from last period</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Token Activity</CardTitle>
                  <CardDescription>Transaction volume and count over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-full">Loading Token Activity...</div>
                  ) : metricsError ? (
                    <div className="flex items-center justify-center h-full text-red-500">Error: {metricsError}</div>
                  ) : (
                    <ChartContainer 
                      config={{ 
                        transactions: { theme: { light: '#0088FE', dark: '#0088FE' } },
                        volume: { theme: { light: '#00C49F', dark: '#00C49F' } }
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={tokenActivityData}
                          margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="transactions"
                            name="Transactions"
                            stroke="#0088FE"
                            fill="#0088FE"
                            fillOpacity={0.3}
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            dataKey="volume"
                            name="Volume ($)"
                            stroke="#00C49F"
                            fill="#00C49F"
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>Active users and new user registrations</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-full">Loading User Activity...</div>
                  ) : metricsError ? (
                    <div className="flex items-center justify-center h-full text-red-500">Error: {metricsError}</div>
                  ) : (
                    <ChartContainer 
                      config={{ 
                        active: { theme: { light: '#8884d8', dark: '#8884d8' } },
                        new: { theme: { light: '#82ca9d', dark: '#82ca9d' } } 
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={userActivityData}
                          margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="active"
                            name="Active Users"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="new"
                            name="New Users"
                            stroke="#82ca9d"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transactions by Type</CardTitle>
                  <CardDescription>Distribution of transaction types</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-full">Loading Transactions by Type...</div>
                  ) : metricsError ? (
                    <div className="flex items-center justify-center h-full text-red-500">Error: {metricsError}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={transactionsByTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {transactionsByTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                  <CardDescription>Distribution of user roles</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {isLoadingMetrics ? (
                    <div className="flex items-center justify-center h-full">Loading Users by Role...</div>
                  ) : metricsError ? (
                    <div className="flex items-center justify-center h-full text-red-500">Error: {metricsError}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={usersByRoleData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {usersByRoleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage</CardTitle>
                <CardDescription>Read and write operations over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {isLoadingMetrics ? (
                  <div className="flex items-center justify-center h-full">Loading API Usage...</div>
                ) : metricsError ? (
                  <div className="flex items-center justify-center h-full text-red-500">Error: {metricsError}</div>
                ) : (
                  <ChartContainer
                    config={{ 
                      reads: { theme: { light: '#8884d8', dark: '#8884d8' } },
                      writes: { theme: { light: '#82ca9d', dark: '#82ca9d' } } 
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={apiUsageData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Bar dataKey="reads" name="Read Operations" fill="#8884d8" />
                        <Bar dataKey="writes" name="Write Operations" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top API Endpoints</CardTitle>
                  <CardDescription>Most frequently used API endpoints</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className="flex justify-between">
                      <div className="text-sm font-medium">/api/tokens</div>
                      <div className="text-sm text-muted-foreground">324 calls</div>
                    </li>
                    <li className="flex justify-between">
                      <div className="text-sm font-medium">/api/users</div>
                      <div className="text-sm text-muted-foreground">256 calls</div>
                    </li>
                    <li className="flex justify-between">
                      <div className="text-sm font-medium">/api/transactions</div>
                      <div className="text-sm text-muted-foreground">189 calls</div>
                    </li>
                    <li className="flex justify-between">
                      <div className="text-sm font-medium">/api/dashboard</div>
                      <div className="text-sm text-muted-foreground">145 calls</div>
                    </li>
                    <li className="flex justify-between">
                      <div className="text-sm font-medium">/api/settings</div>
                      <div className="text-sm text-muted-foreground">92 calls</div>
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>API errors and success rates</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Success", value: 95 },
                          { name: "Client Error", value: 3 },
                          { name: "Server Error", value: 2 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#4ade80" />
                        <Cell fill="#facc15" />
                        <Cell fill="#f87171" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Create and save custom reports based on your specific needs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="reportTitle">Report Title</Label>
                    <Input
                      id="reportTitle"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="e.g., Monthly Token Activity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportType">Report Type</Label>
                    <Select
                      value={reportType}
                      onValueChange={(value) => setReportType(value as 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user_activity">User Activity</SelectItem>
                        <SelectItem value="token_usage">Token Usage</SelectItem>
                        <SelectItem value="security_events">Security Events</SelectItem>
                        <SelectItem value="organization_summary">Organization Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportFormat">Format</Label>
                    <Select
                      value={reportFormat}
                      onValueChange={(value) => setReportFormat(value as 'json' | 'csv' | 'pdf')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportDateRange">Date Range</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="reportDateRange"
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reportDateRange?.from ? (
                            reportDateRange.to ? (
                              <>
                                {format(reportDateRange.from, "LLL dd, y")} -{" "}
                                {format(reportDateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(reportDateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={reportDateRange?.from}
                          selected={reportDateRange}
                          onSelect={setReportDateRange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {canWrite && (
                  <Button onClick={handleGenerateReport} className="mt-4" disabled={isGeneratingReport}>
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </Button>
                )}
                {reportError && <p className="text-red-500 text-sm mt-2">{reportError}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Past Reports</CardTitle>
                <CardDescription>Recently generated reports available for download</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingReports ? (
                  <div className="text-center py-8">Loading past reports...</div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No reports generated yet.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Generated On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.title}</TableCell>
                          <TableCell>{report.type}</TableCell>
                          <TableCell>{report.format}</TableCell>
                          <TableCell>{format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                          <TableCell className="text-right">
                            {report.status === 'completed' && report.fileUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">Download</a>
                              </Button>
                            )}
                            {report.status === 'generating' && (
                              <span className="text-muted-foreground">Generating...</span>
                            )}
                            {report.status === 'failed' && (
                              <span className="text-red-500">Failed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
        </Tabs>
      </div>
  );
};

export default ReportsPage;