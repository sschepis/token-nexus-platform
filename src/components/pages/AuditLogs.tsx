import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchAuditLogs, AuditEvent, AuditEventType, AuditSeverity, setEventTypeFilter, setSeverityFilter, setDateRangeFilter, resetFilters, auditSelectors } from "@/store/slices/auditSlice";
// import AppLayout from "@/components/layout/AppLayout"; // Removed AppLayout import
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, FilterIcon, RefreshCwIcon } from "lucide-react";
import { apiService } from "@/services/api";

const AuditLogs: React.FC = () => {
  const dispatch = useAppDispatch();
  const events = useAppSelector(auditSelectors.selectEvents);
  const isLoading = useAppSelector(auditSelectors.selectIsLoading);
  const error = useAppSelector(auditSelectors.selectAuditError);
  const filters = useAppSelector(auditSelectors.selectFilters);
  
  const [activeTab, setActiveTab] = useState<AuditEventType | "all">("all");
  
  // Fetch audit events
  useEffect(() => {
    dispatch(fetchAuditLogs({}));
  }, [dispatch]);

  const filteredEvents = activeTab === "all" 
    ? events 
    : events.filter(event => event.eventType === activeTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as AuditEventType | "all");
    
    if (value === "all") {
      dispatch(setEventTypeFilter(null));
    } else {
      dispatch(setEventTypeFilter([value as AuditEventType]));
    }
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
    setActiveTab("all");
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getEventTypeColor = (eventType: AuditEventType) => {
    switch (eventType) {
      case "user_activity":
        return "bg-blue-100 text-blue-800";
      case "security":
        return "bg-red-100 text-red-800";
      case "token_usage":
        return "bg-purple-100 text-purple-800";
      case "admin_action":
        return "bg-indigo-100 text-indigo-800";
      case "organization_summary":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              Error loading audit logs: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-gray-600 mt-2">Monitor system activities and security events</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => dispatch(fetchAuditLogs({}))}
            disabled={isLoading}
          >
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleResetFilters}>
            <FilterIcon className="w-4 h-4 mr-2" />
            Reset Filters
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            View and filter system audit events by type and severity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="user_activity">User Activity</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="token_usage">Token Usage</TabsTrigger>
              <TabsTrigger value="admin_action">Admin Actions</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading audit logs...</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No audit events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge className={getEventTypeColor(event.eventType)}>
                            {event.eventType.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={event.description}>
                            {event.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.userEmail || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{event.userId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(event.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {event.ipAddress || 'N/A'}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
