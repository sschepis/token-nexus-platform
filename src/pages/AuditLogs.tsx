
import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchAuditEventsStart, fetchAuditEventsSuccess, fetchAuditEventsFailed, AuditEvent, AuditEventType, AuditSeverity, setEventTypeFilter, setSeverityFilter, setDateRangeFilter, resetFilters } from "@/store/slices/auditSlice";
import AppLayout from "@/components/layout/AppLayout";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Filter, DownloadIcon, Activity, Shield, Coins, UserCog } from "lucide-react";
import { format } from "date-fns";
import { mockApis } from "@/services/api";

const AuditLogs = () => {
  const dispatch = useAppDispatch();
  const { events, isLoading, filters } = useAppSelector((state) => state.audit);
  const { user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<AuditEventType | "all">("all");
  
  // Fetch audit events
  useEffect(() => {
    dispatch(fetchAuditEventsStart());
    
    // Mock API call - in a real app, this would be an actual API call
    const mockAuditEvents: AuditEvent[] = [
      {
        id: "audit-1",
        eventType: "user_activity",
        description: "User login successful",
        userId: "user-123",
        userEmail: "john.doe@example.com",
        timestamp: new Date().toISOString(),
        severity: "low",
        ipAddress: "192.168.1.1",
      },
      {
        id: "audit-2",
        eventType: "security",
        description: "Failed login attempt",
        userId: "unknown",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        severity: "medium",
        ipAddress: "203.0.113.1",
      },
      {
        id: "audit-3",
        eventType: "token_usage",
        description: "API token used for access",
        userId: "user-456",
        userEmail: "jane.smith@example.com",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        severity: "low",
        metadata: { tokenId: "token-123", endpoint: "/api/data", method: "GET" },
      },
      {
        id: "audit-4",
        eventType: "admin_action",
        description: "User role updated",
        userId: "user-123",
        userEmail: "john.doe@example.com",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        severity: "medium",
        metadata: { action: "role_update", targetUser: "user-789", newRole: "developer" },
      },
      {
        id: "audit-5",
        eventType: "security",
        description: "Password changed",
        userId: "user-456",
        userEmail: "jane.smith@example.com",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        severity: "medium",
        ipAddress: "198.51.100.1",
      },
      {
        id: "audit-6",
        eventType: "admin_action",
        description: "New user invited",
        userId: "user-123",
        userEmail: "john.doe@example.com",
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        severity: "low",
        metadata: { invitedUser: "mike.johnson@example.com" },
      },
      {
        id: "audit-7",
        eventType: "token_usage",
        description: "API rate limit reached",
        userId: "user-789",
        userEmail: "mike.johnson@example.com",
        timestamp: new Date(Date.now() - 345600000).toISOString(),
        severity: "high",
        metadata: { tokenId: "token-456", limit: "100/min" },
      },
    ];
    
    setTimeout(() => {
      dispatch(fetchAuditEventsSuccess(mockAuditEvents));
    }, 500);
    
  }, [dispatch]);
  
  // Filter events based on active tab
  const filteredEvents = activeTab === "all" 
    ? events 
    : events.filter(event => event.eventType === activeTab);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as AuditEventType | "all");
    if (value === "all") {
      dispatch(setEventTypeFilter(null));
    } else {
      dispatch(setEventTypeFilter([value as AuditEventType]));
    }
  };
  
  // Reset filters
  const handleResetFilters = () => {
    dispatch(resetFilters());
    setActiveTab("all");
  };
  
  // Severity badge color
  const getSeverityColor = (severity: AuditSeverity) => {
    switch (severity) {
      case "low": return "bg-blue-100 text-blue-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Event type icon
  const getEventTypeIcon = (type: AuditEventType) => {
    switch (type) {
      case "user_activity": return <Activity className="h-4 w-4" />;
      case "security": return <Shield className="h-4 w-4" />;
      case "token_usage": return <Coins className="h-4 w-4" />;
      case "admin_action": return <UserCog className="h-4 w-4" />;
      default: return null;
    }
  };
  
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all activities and actions in your organization
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Reset Filters
            </Button>
            <Button variant="outline" size="sm">
              <DownloadIcon className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

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
                      onValueChange={(value) => 
                        dispatch(setSeverityFilter(value === "all" ? null : [value as AuditSeverity]))
                      }
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
                    
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Search events"
                        className="w-[240px]"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Last 7 days
                    </span>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            Loading audit logs...
                          </TableCell>
                        </TableRow>
                      ) : filteredEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4">
                            No audit events found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell className="font-mono">
                              {format(new Date(event.timestamp), "yyyy-MM-dd HH:mm")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {getEventTypeIcon(event.eventType)}
                                <span className="capitalize">{event.eventType.replace('_', ' ')}</span>
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
              <div>Showing {filteredEvents.length} of {events.length} events</div>
              <div>Updated just now</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AuditLogs;
