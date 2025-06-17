import React, { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  fetchAuditLogs,
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  setEventTypeFilter,
  setSeverityFilter,
  setDateRangeFilter,
  resetFilters,
  clearErrors, // clearAuditErrors
  deleteAuditLog,
  exportAuditLogs,
} from "@/store/slices/auditSlice";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Filter, DownloadIcon, Activity, Shield, Coins, UserCog, Loader2, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { usePageController } from "@/hooks/usePageController";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AuditLogsPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const dispatch = useAppDispatch();
  const { events, isLoading, totalCount, hasMore, filters } = useAppSelector((state) => state.audit);
  const auditError = null;
  const { user } = useAppSelector((state) => state.auth);

  // Permission checks
  const canRead = hasPermission('audit:read');
  const canWrite = hasPermission('audit:write');
  const canDelete = hasPermission('audit:delete');

  const [activeTab, setActiveTab] = useState<AuditEventType | "all">(filters.eventType && filters.eventType.length > 0 ? filters.eventType[0] : "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.dateRange.start ? new Date(filters.dateRange.start) : undefined,
    to: filters.dateRange.end ? new Date(filters.dateRange.end) : undefined,
  });
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | "all">(filters.severity && filters.severity.length > 0 ? filters.severity[0] : "all");

  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [controllerEvents, setControllerEvents] = useState<any[]>([]);
  const [isControllerLoading, setIsControllerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'audit-logs',
    pageName: 'Audit Logs',
    description: 'Track all activities and actions in your organization',
    category: 'security',
    permissions: ['audit:read', 'audit:write', 'audit:delete'],
    tags: ['audit', 'logs', 'security', 'tracking']
  });

  // Load audit logs from controller
  const loadAuditLogs = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsControllerLoading(true);
    setError(null);
    
    try {
      const params: any = {};
      
      if (activeTab !== "all") {
        params.eventTypes = [activeTab];
      }
      if (selectedSeverity !== "all") {
        params.severity = [selectedSeverity];
      }
      if (dateRange.from) {
        params.startDate = dateRange.from.toISOString();
      }
      if (dateRange.to) {
        params.endDate = dateRange.to.toISOString();
      }

      const result = await pageController.executeAction('fetchAuditLogs', params);
      
      if (result.success && result.data) {
        const logsData = result.data as { events: any[] };
        setControllerEvents(logsData.events || []);
        toast({
          title: "Audit logs loaded",
          description: "Audit logs loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load audit logs');
        toast({
          title: "Error loading audit logs",
          description: result.error || 'Failed to load audit logs',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setError('Failed to load audit logs');
      toast({
        title: "Error loading audit logs",
        description: 'Failed to load audit logs',
        variant: "destructive",
      });
    } finally {
      setIsControllerLoading(false);
    }
  };

  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadAuditLogs();
    }
  }, [pageController.isRegistered, canRead, activeTab, selectedSeverity, dateRange]);

  // Fetch audit logs based on filters (keep Redux for backward compatibility)
  useEffect(() => {
    if (!canRead) return;
    
    dispatch(clearErrors());

    const params: {
      startDate?: string;
      endDate?: string;
      actions?: string[];
      severity?: AuditSeverity[];
    } = {};

    if (activeTab !== "all") {
      params.actions = [activeTab];
    }
    if (selectedSeverity !== "all") {
      params.severity = [selectedSeverity];
    }
    if (dateRange.from) {
      params.startDate = dateRange.from.toISOString();
    }
    if (dateRange.to) {
      params.endDate = dateRange.to.toISOString();
    }

    dispatch(fetchAuditLogs(params));
  }, [dispatch, canRead, activeTab, selectedSeverity, dateRange]);

  // Handle errors from Redux slice
  useEffect(() => {
    if (auditError) {
      toast({
        title: "Audit Log Error",
        description: auditError,
        variant: "destructive",
      });
      dispatch(clearErrors());
    }
  }, [auditError, toast, dispatch]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as AuditEventType | "all");
    dispatch(setEventTypeFilter(value === "all" ? null : [value as AuditEventType]));
  };
  
  const handleSeverityChange = (value: string) => {
    setSelectedSeverity(value === "all" ? "all" : (value as AuditSeverity));
    dispatch(setSeverityFilter(value === "all" ? null : [value as AuditSeverity]));
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setDateRange({ from: range?.from || undefined, to: range?.to || undefined });
    dispatch(setDateRangeFilter({ 
      start: range?.from?.toISOString() || null, 
      end: range?.to?.toISOString() || null 
    }));
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
    setActiveTab("all");
    setSelectedSeverity("all");
    setDateRange({ from: undefined, to: undefined });
    setSearchTerm("");
     dispatch(fetchAuditLogs({})); // Re-fetch all logs after reset
  };
  
  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case "low": return "bg-blue-100 text-blue-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getEventTypeIcon = (type: AuditEventType) => {
    switch (type) {
      case "user_activity": return <Activity className="h-4 w-4" />;
      case "security": return <Shield className="h-4 w-4" />;
      case "token_usage": return <Coins className="h-4 w-4" />;
      case "admin_action": return <UserCog className="h-4 w-4" />;
      default: return null;
    }
  };

  // Use controller events if available, fallback to Redux events
  const allEvents = controllerEvents.length > 0 ? controllerEvents : events;
  
  const filteredEvents = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return allEvents.filter(event =>
      event.description.toLowerCase().includes(lowercasedSearchTerm) ||
      event.userEmail?.toLowerCase().includes(lowercasedSearchTerm) ||
      event.userId.toLowerCase().includes(lowercasedSearchTerm) ||
      event.ipAddress?.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [allEvents, searchTerm]);

  const handleDeleteConfirmation = (logId: string) => {
    if (!canDelete) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete audit logs",
        variant: "destructive",
      });
      return;
    }
    setConfirmDeleteLogId(logId);
    setDeleteReason(""); // Clear previous reason
  };

  const handleDeleteAuditLog = async () => {
    if (!canDelete) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to delete audit logs",
        variant: "destructive",
      });
      return;
    }

    if (!confirmDeleteLogId || !deleteReason || deleteReason.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please provide a deletion reason of at least 10 characters.",
        variant: "destructive",
      });
      return;
    }
    
    setIsDeleting(true);
    
    if (pageController.isRegistered) {
      try {
        const result = await pageController.executeAction('deleteAuditLog', {
          logId: confirmDeleteLogId,
          reason: deleteReason.trim()
        });

        if (result.success) {
          toast({
            title: "Audit log deleted",
            description: "Audit log deleted successfully",
          });
          setConfirmDeleteLogId(null);
          await loadAuditLogs(); // Refresh logs
        } else {
          toast({
            title: "Error deleting audit log",
            description: result.error || 'Failed to delete audit log',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error deleting audit log:', error);
        toast({
          title: "Error deleting audit log",
          description: 'Failed to delete audit log',
          variant: "destructive",
        });
      }
    }

    // Also keep Redux call for backward compatibility
    try {
      await dispatch(deleteAuditLog(confirmDeleteLogId)).unwrap();
      toast({
        title: "Audit Log Deleted",
        description: "The audit log has been successfully deleted.",
      });
      setConfirmDeleteLogId(null);
    } catch (error) {
       // Error handled by useEffect
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRefreshLogs = async () => {
    await loadAuditLogs();
  };

  const handleExportLogs = async (format: string) => {
    if (!canRead) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to export audit logs",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const params: {
        format: 'csv' | 'json' | 'pdf';
        filters?: {
          startDate?: string;
          endDate?: string;
          actions?: string[];
          userIds?: string[];
          resourceType?: string;
        };
      } = { format: format as 'csv' | 'json' | 'pdf' };

      if (activeTab !== "all") {
        params.filters = { ...params.filters, actions: [activeTab] };
      }
      if (dateRange.from) {
        params.filters = { ...params.filters, startDate: dateRange.from.toISOString() };
      }
      if (dateRange.to) {
        params.filters = { ...params.filters, endDate: dateRange.to.toISOString() };
      }
      // Add other filters if available in UI

      const result = await dispatch(exportAuditLogs(params)).unwrap();
      
      const filename = result.metadata.filename || `audit_logs.${format}`;
      const blob = new Blob([result.data], { type: result.metadata.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Audit logs exported as ${format.toUpperCase()}`,
      });

    } catch (error) {
      // Error handled by useEffect
    } finally {
      setIsExporting(false);
    }
  };
  
  // Show permission error if user can't read audit logs
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all activities and actions in your organization
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view audit logs. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all activities and actions in your organization
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshLogs}
              disabled={isControllerLoading}
            >
              {isControllerLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Reset Filters
            </Button>
            {canRead && (
              <Select onValueChange={handleExportLogs} disabled={isExporting}>
                <SelectTrigger className="w-[120px]">
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DownloadIcon className="h-4 w-4 mr-1" />}
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Event Log</CardTitle>
            <CardDescription>
              Review security events, user activities, and system actions
            </CardDescription>
          </CardHeader>
          <div className="px-6">
            <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="user_activity">User Activity</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="token_usage">Token Usage</TabsTrigger>
                <TabsTrigger value="admin_action">Admin Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Select
                      value={selectedSeverity}
                      onValueChange={handleSeverityChange}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input
                      type="text"
                      placeholder="Search events"
                      className="w-[240px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[280px] justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={handleDateRangeSelect}
                          numberOfMonths={2}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead className="w-[120px]">Event Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="w-[100px]">Severity</TableHead>
                        <TableHead className="w-[120px]">IP Address</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            Loading audit logs...
                          </TableCell>
                        </TableRow>
                      ) : filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No audit events found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono">
                              {format(new Date(event.createdAt), "yyyy-MM-dd HH:mm")} {/* Use createdAt */}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getEventTypeIcon(event.eventType)}
                                <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span> {/* Replaced all underscores */}
                              </div>
                            </TableCell>
                            <TableCell>{event.description}</TableCell>
                            <TableCell>{event.userEmail || event.userId}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                                {event.severity}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono">{event.ipAddress || '-'}</TableCell>
                            <TableCell>
                              {canDelete && (
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(event.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>Showing {filteredEvents.length} of {totalCount} events</div>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasMore && <Button variant="link" size="sm">Load More</Button>} {/* TODO: Implement Load More */}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!confirmDeleteLogId}
          onOpenChange={(open) => {
            if (!open) setConfirmDeleteLogId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this audit log. You must provide a reason.
                <Textarea
                  placeholder="Reason for deleting this audit log (min 10 characters)"
                  className="mt-4"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAuditLog}
                disabled={isDeleting || deleteReason.trim().length < 10}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};

export default AuditLogsPage;