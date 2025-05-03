
import React, { useState } from "react";
import { Logs, Search, RefreshCw, Filter, Download, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source?: string;
  details?: string;
}

// Mock data for demonstration purposes
const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  const sources = ["api", "frontend", "database", "authentication", "system"];
  const messages = [
    "User login successful",
    "API request completed in 234ms",
    "Database query executed",
    "Component mounted",
    "Invalid credentials provided",
    "Connection timeout",
    "Cache invalidated",
    "Session expired",
    "Permission denied for resource access",
    "Rate limit exceeded",
  ];

  for (let i = 0; i < 100; i++) {
    const level: LogLevel = ["info", "warn", "error", "debug"][Math.floor(Math.random() * 4)] as LogLevel;
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    const source = sources[Math.floor(Math.random() * sources.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    logs.push({
      id: `log-${i}`,
      timestamp,
      level,
      message: `[${source}] ${message}`,
      source,
      details: level === "error" ? "Error stack trace:\n  at Function.Module._load (node:internal/modules/cjs/loader:757:27)\n  at Module.require (node:internal/modules/cjs/loader:997:19)" : undefined
    });
  }

  // Sort by timestamp descending
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const LogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>(generateMockLogs());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Get unique sources for filtering
  const sources = Array.from(new Set(logs.map(log => log.source))).filter(Boolean) as string[];

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setLogs(generateMockLogs());
      setIsLoading(false);
    }, 800);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleDownload = () => {
    const filteredLogs = filterLogs();
    const content = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filterLogs = () => {
    return logs.filter(log => {
      const matchesSearch = searchQuery === "" || 
        log.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
      
      const matchesSource = selectedSource === "all" || log.source === selectedSource;
      
      const matchesTab = selectedTab === "all" || 
        (selectedTab === "errors" && log.level === "error") ||
        (selectedTab === "warnings" && log.level === "warn") ||
        (selectedTab === "info" && log.level === "info") ||
        (selectedTab === "debug" && log.level === "debug");
      
      return matchesSearch && matchesLevel && matchesSource && matchesTab;
    });
  };

  const filteredLogs = filterLogs();

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "error": return "bg-destructive text-destructive-foreground";
      case "warn": return "bg-warning text-warning-foreground";
      case "info": return "bg-info text-info-foreground";
      case "debug": return "bg-muted text-muted-foreground";
      default: return "bg-primary text-primary-foreground";
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Debug Logs Viewer</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={filteredLogs.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="destructive" onClick={handleClearLogs} disabled={logs.length === 0}>
            <Trash className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Log Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">{logs.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="errors">
            Errors
            <Badge variant="destructive" className="ml-2">
              {logs.filter(log => log.level === "error").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Warnings
            <Badge variant="warning" className="ml-2">
              {logs.filter(log => log.level === "warn").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="info">
            Info
            <Badge variant="secondary" className="ml-2">
              {logs.filter(log => log.level === "info").length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="debug">
            Debug
            <Badge variant="outline" className="ml-2">
              {logs.filter(log => log.level === "debug").length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Logs className="h-5 w-5 mr-2" />
              Application Logs
              <Badge variant="outline" className="ml-2">{filteredLogs.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLogs.length > 0 ? (
              <ScrollArea className="h-[60vh]">
                <div className="divide-y">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-muted/20">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getLevelColor(log.level)}>
                            {log.level.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="font-mono">{log.message}</p>
                      {log.details && (
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                          {log.details}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No logs found. Adjust your filters or refresh to see new logs.
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default LogsViewer;
