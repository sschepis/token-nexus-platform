import React, { useState, useEffect } from "react";
import { Search, RefreshCw, Download, Clock, Wifi, NetworkIcon as NetworkIconLucide, FileBadge, FileWarning, FileX, Filter } from "lucide-react"; // Renamed NetworkIcon to avoid conflict
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DevToolsWrapper } from "@/components/dev/DevToolsWrapper";
interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status: number;
  statusText: string;
  contentType: string;
  size: number;
  startTime: Date;
  endTime: Date;
  duration: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  type: "xhr" | "fetch" | "script" | "stylesheet" | "image" | "other";
  initiator: string;
}

const NetworkInspectorPage: React.FC = () => {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState<string>("headers");

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const generateMockData = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
      const statuses = [
        { code: 200, text: "OK" }, { code: 201, text: "Created" },
        { code: 204, text: "No Content" }, { code: 400, text: "Bad Request" },
        { code: 401, text: "Unauthorized" }, { code: 403, text: "Forbidden" },
        { code: 404, text: "Not Found" }, { code: 500, text: "Internal Server Error" }
      ];
      const contentTypes = [
        "application/json", "text/html", "text/plain", "application/xml",
        "image/jpeg", "image/png", "text/css", "application/javascript"
      ];
      const types: NetworkRequest['type'][] = [
        "xhr", "fetch", "script", "stylesheet", "image", "other"
      ];
      const paths = [
        "/api/users", "/api/products", "/api/auth/login", "/api/orders", "/api/settings",
        "/assets/main.js", "/assets/style.css", "/images/logo.png"
      ];
      const domains = [
        "api.example.com", "cdn.example.com", "auth.example.com",
        "images.example.com", "analytics.example.com"
      ];
      
      const now = new Date();
      const mockRequests: NetworkRequest[] = [];
      
      for (let i = 0; i < 30; i++) {
        const method = methods[Math.floor(Math.random() * methods.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const path = paths[Math.floor(Math.random() * paths.length)];
        const url = `https://${domain}${path}`;
        const size = Math.floor(Math.random() * 500000);
        const duration = Math.floor(Math.random() * 2000);
        const startTime = new Date(now.getTime() - Math.random() * 60000);
        const endTime = new Date(startTime.getTime() + duration);
        
        mockRequests.push({
          id: `req-${i}`, url, method, status: status.code, statusText: status.text,
          contentType, size, startTime, endTime, duration, type,
          initiator: type === "xhr" || type === "fetch" ? "script.js:128" : "index.html:45",
          requestHeaders: { "Accept": contentType, "User-Agent": "Mozilla/5.0", "Authorization": "Bearer token...", "Content-Type": method !== "GET" ? "application/json" : "" },
          responseHeaders: { "Content-Type": contentType, "Content-Length": size.toString(), "Server": "Nginx", "Cache-Control": "max-age=3600" },
          requestBody: method !== "GET" ? JSON.stringify({ key: "value" }, null, 2) : undefined,
          responseBody: contentType === "application/json" ? JSON.stringify({ id: i, name: "Test Data", success: true }, null, 2) : contentType === "text/html" ? "<div>HTML Content</div>" : undefined
        });
      }
      setRequests(mockRequests);
      setIsLoading(false);
    }, 1000);
  };

  useEffect(() => {
    generateMockData();
  }, []);

  const handleRefresh = () => generateMockData();
  const handleClear = () => { setRequests([]); setSelectedRequest(null); toast.info("Network requests cleared"); };

  const handleDownload = () => {
    if (typeof window === 'undefined') return;
    const content = JSON.stringify(requests, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-requests-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Network data exported successfully");
  };

  const toggleRecording = () => { setIsRecording(!isRecording); toast.info(isRecording ? "Network recording paused" : "Network recording resumed"); };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = searchQuery === "" || req.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMethod = filterMethod === "all" || req.method === filterMethod;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "success" && req.status >= 200 && req.status < 300) ||
      (filterStatus === "redirect" && req.status >= 300 && req.status < 400) ||
      (filterStatus === "client-error" && req.status >= 400 && req.status < 500) ||
      (filterStatus === "server-error" && req.status >= 500);
    const matchesType = filterType === "all" || req.type === filterType;
    return matchesSearch && matchesMethod && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-700">{status}</Badge>;
    if (status >= 300 && status < 400) return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-700">{status}</Badge>;
    if (status >= 400 && status < 500) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-700">{status}</Badge>;
    return <Badge variant="destructive">{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "xhr": case "fetch": return <NetworkIconLucide className="h-4 w-4 text-blue-500" />;
      case "script": return <FileBadge className="h-4 w-4 text-purple-500" />;
      case "stylesheet": return <FileBadge className="h-4 w-4 text-green-500" />;
      case "image": return <FileWarning className="h-4 w-4 text-yellow-500" />;
      default: return <FileX className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DevToolsWrapper toolName="Network Inspector">
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Network Inspector</h1>
          <div className="flex gap-2">
            <div className="flex items-center space-x-2">
              <Switch id="recording" checked={isRecording} onCheckedChange={toggleRecording} />
              <Label htmlFor="recording">{isRecording ? "Recording" : "Paused"}</Label>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={requests.length === 0}>Clear</Button>
            <Button variant="outline" onClick={handleDownload} disabled={requests.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter by URL..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full sm:w-[110px]" id="filter-method"><Filter className="h-4 w-4 mr-1 sm:mr-2" /><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem><SelectItem value="DELETE">DELETE</SelectItem><SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px]" id="filter-status"><Filter className="h-4 w-4 mr-1 sm:mr-2" /><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem><SelectItem value="success">Success (2xx)</SelectItem>
                <SelectItem value="redirect">Redirect (3xx)</SelectItem><SelectItem value="client-error">Client Error (4xx)</SelectItem>
                <SelectItem value="server-error">Server Error (5xx)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[130px]" id="filter-type"><Filter className="h-4 w-4 mr-1 sm:mr-2" /><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem><SelectItem value="xhr">XHR</SelectItem><SelectItem value="fetch">Fetch</SelectItem>
                <SelectItem value="script">Script</SelectItem><SelectItem value="stylesheet">Stylesheet</SelectItem>
                <SelectItem value="image">Image</SelectItem><SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center"><Wifi className="h-5 w-5 mr-2" />Network Requests <Badge variant="outline" className="ml-2">{filteredRequests.length}</Badge></CardTitle>
              <CardDescription>HTTP requests captured during page load and user interaction</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-380px)]"> {/* Adjusted height */}
                {isLoading ? (
                  <div className="p-8 text-center"><RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" /><p className="mt-2">Loading network activity...</p></div>
                ) : filteredRequests.length > 0 ? (
                  <div className="divide-y">
                    {filteredRequests.map((req) => (
                      <div key={req.id} className={`p-4 hover:bg-muted/20 cursor-pointer ${selectedRequest?.id === req.id ? "bg-muted" : ""}`} onClick={() => setSelectedRequest(req)}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(req.type)}
                            <span className="font-medium truncate max-w-[150px] sm:max-w-[200px]">{typeof window !== 'undefined' ? new URL(req.url).pathname : req.url}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-primary/10">{req.method}</Badge>
                            {getStatusBadge(req.status)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{req.url}</div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <div>{formatBytes(req.size)}</div>
                          <div className="flex items-center"><Clock className="h-3 w-3 mr-1" />{req.duration}ms</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">No network requests captured.{searchQuery || filterMethod !== "all" || filterStatus !== "all" || filterType !== "all" ? " Try adjusting your filters." : " Click Refresh to capture network activity."}</div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center"><NetworkIconLucide className="h-5 w-5 mr-2" />Request Details</CardTitle>
              {selectedRequest && (<CardDescription className="truncate">{selectedRequest.method} {selectedRequest.url}</CardDescription>)}
            </CardHeader>
            {selectedRequest ? (
              <CardContent className="p-0">
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                  <TabsList className="grid grid-cols-4 mb-1 mx-4 mt-0"> {/* Adjusted margin/padding */}
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                    <TabsTrigger value="timing">Timing</TabsTrigger>
                  </TabsList>
                  <ScrollArea className="h-[calc(100vh-450px)] px-4 pb-4"> {/* Adjusted height and added padding */}
                    <TabsContent value="headers">
                      <h3 className="text-sm font-medium mb-2 mt-2">General</h3>
                      <div className="bg-muted rounded-md p-3 text-sm">
                        <div className="grid grid-cols-3 gap-1">
                          <div className="font-medium">Request URL:</div><div className="col-span-2 break-all">{selectedRequest.url}</div>
                          <div className="font-medium">Request Method:</div><div className="col-span-2">{selectedRequest.method}</div>
                          <div className="font-medium">Status Code:</div><div className="col-span-2">{selectedRequest.status} {selectedRequest.statusText}</div>
                          <div className="font-medium">Content Type:</div><div className="col-span-2">{selectedRequest.contentType}</div>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium mt-4 mb-2">Request Headers</h3>
                      <div className="bg-muted rounded-md p-3 text-sm">
                        <div className="space-y-1">{Object.entries(selectedRequest.requestHeaders).map(([key, value]) => (<div key={key} className="grid grid-cols-3 gap-1"><div className="font-medium">{key}:</div><div className="col-span-2 break-all">{value}</div></div>))}</div>
                      </div>
                      <h3 className="text-sm font-medium mt-4 mb-2">Response Headers</h3>
                      <div className="bg-muted rounded-md p-3 text-sm">
                        <div className="space-y-1">{Object.entries(selectedRequest.responseHeaders).map(([key, value]) => (<div key={key} className="grid grid-cols-3 gap-1"><div className="font-medium">{key}:</div><div className="col-span-2 break-all">{value}</div></div>))}</div>
                      </div>
                    </TabsContent>
                    <TabsContent value="request">
                      <h3 className="text-sm font-medium mb-2 mt-2">Request Body</h3>
                      {selectedRequest.requestBody ? (<pre className="bg-muted rounded-md p-3 text-sm overflow-auto">{selectedRequest.requestBody}</pre>) : (<div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">No request body</div>)}
                    </TabsContent>
                    <TabsContent value="response">
                      <div className="flex justify-between mb-2 mt-2"><h3 className="text-sm font-medium">Response Body</h3><div className="text-xs text-muted-foreground">Size: {formatBytes(selectedRequest.size)}</div></div>
                      {selectedRequest.responseBody ? (<pre className="bg-muted rounded-md p-3 text-sm overflow-auto">{selectedRequest.responseBody}</pre>) : (<div className="bg-muted rounded-md p-3 text-sm text-muted-foreground">No response body</div>)}
                    </TabsContent>
                    <TabsContent value="timing">
                      <h3 className="text-sm font-medium mb-2 mt-2">Timing Information</h3>
                      <div className="bg-muted rounded-md p-3 text-sm">
                        <div className="grid grid-cols-2 gap-1">
                          <div className="font-medium">Start Time:</div><div>{selectedRequest.startTime.toLocaleString()}</div>
                          <div className="font-medium">End Time:</div><div>{selectedRequest.endTime.toLocaleString()}</div>
                          <div className="font-medium">Duration:</div><div>{selectedRequest.duration}ms</div>
                        </div>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>
              </CardContent>
            ) : (
              <CardContent className="p-8 text-center text-muted-foreground">Select a request from the list to see details.</CardContent>
            )}
          </Card>
        </div>
      </div>
    </DevToolsWrapper>
  );
};

export default NetworkInspectorPage;