import React, { useState, useEffect, useMemo } from 'react';
import { format } from "date-fns";
import { CalendarIcon, Activity, Shield, Coins, UserCog, AlertCircle, RefreshCw, Filter, DownloadIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { usePageController } from "@/hooks/usePageController";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AuditEventType = "user_activity" | "security" | "token_usage" | "admin_action";
type AuditSeverity = "low" | "medium" | "high" | "critical";

const AuditLogsPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  // Permission checks
  const canRead = hasPermission('audit:read');
  const canWrite = hasPermission('audit:write');
  const canDelete = hasPermission('audit:delete');

  const [activeTab, setActiveTab] = useState<AuditEventType | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | "all">("all");

  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

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
    
    setIsLoading(true);
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
        const logsData = result.data as { events: any[], total?: number };
        setEvents(logsData.events || []);
        setTotalCount(logsData.total || logsData.events?.length || 0);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadAuditLogs();
    }
  }, [pageController.isRegistered, canRead, activeTab, selectedSeverity, dateRange]);

  const handleRefreshLogs = () => {
    loadAuditLogs();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as AuditEventType | "all");
  };

  const handleSeverityChange = (value: string) => {
    setSelectedSeverity(value as AuditSeverity | "all");
  };

  const handleDateRangeSelect = (range: any) => {
    if (range) {
      setDateRange({
        from: range.from,
        to: range.to
      });
    }
  };

  const handleResetFilters = () => {
    setActiveTab("all");
    setSelectedSeverity("all");
    setDateRange({ from: undefined, to: undefined });
    setSearchTerm("");
    loadAuditLogs(); // Re-fetch all logs after reset
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

  const filteredEvents = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return events.filter(event =>
      event.description.toLowerCase().includes(lowercasedSearchTerm) ||
      event.userEmail?.toLowerCase().includes(lowercasedSearchTerm) ||
      event.userId.toLowerCase().includes(lowercasedSearchTerm) ||
      event.ipAddress?.toLowerCase().includes(lowercasedSearchTerm)
    );
  }, [events, searchTerm]);

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
    
    setIsDeleting(false);
  };

  const handleExportLogs = async (format: string) => {
    if (!canRead || !pageController.isRegistered) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to export audit logs",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const params: any = { format };
      
      if (selectedSeverity !== "all") {
        params.severity = [selectedSeverity];
      }
      if (activeTab !== "all") {
        params.eventTypes = [activeTab];
      }
      if (dateRange.from) {
        params.startDate = dateRange.from.toISOString();
      }
      if (dateRange.to) {
        params.endDate = dateRange.to.toISOString();
      }

      const result = await pageController.executeAction('exportAuditLogs', params);
      
      if (result.success && result.data) {
        const exportData = result.data as { filename: string; data: string; contentType: string };
        const blob = new Blob([exportData.data], { type: exportData.contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportData.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `Audit logs exported as ${format.toUpperCase()}`,
        });
      } else {
        toast({
          title: "Export Failed",
          description: result.error || 'Failed to export audit logs',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      toast({
        title: "Export Failed",
        description: 'Failed to export audit logs',
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Show permission error if user can't read audit logs
  if (!canRead) {
    return (
      <div className="container mx-auto space-y-6">
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
    <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all activities and actions in your organization
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshLogs}
              disabled={isLoading}
            >
              {isLoading ? (
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
                              {format(new Date(event.createdAt), "yyyy-MM-dd HH:mm")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getEventTypeIcon(event.eventType)}
                                <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
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