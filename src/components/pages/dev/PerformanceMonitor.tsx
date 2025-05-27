
import React, { useState, useEffect } from "react";
import { Activity, Clock, Cpu, BarChart, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from "@/components/layout/AppLayout";

interface PerformanceMetric {
  id: string;
  timestamp: Date;
  cpu: number;
  memory: number;
  fps: number;
  loadTime: number;
  networkRequests: number;
  networkTime: number;
}

interface ChartData {
  name: string;
  cpu: number;
  memory: number;
  fps: number;
  loadTime: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<string>("metrics");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Generate mock performance data
  const generateMockData = () => {
    setIsLoading(true);
    
    const newMetrics: PerformanceMetric[] = [];
    const newChartData: ChartData[] = [];
    
    for (let i = 0; i < 30; i++) {
      const timestamp = new Date(Date.now() - (29 - i) * 60000);
      const cpu = Math.floor(Math.random() * 40) + 10;
      const memory = Math.floor(Math.random() * 500) + 200;
      const fps = Math.floor(Math.random() * 20) + 50;
      const loadTime = Math.floor(Math.random() * 500) + 100;
      const networkRequests = Math.floor(Math.random() * 20) + 5;
      const networkTime = Math.floor(Math.random() * 300) + 50;

      newMetrics.push({
        id: `metric-${i}`,
        timestamp,
        cpu,
        memory,
        fps,
        loadTime,
        networkRequests,
        networkTime
      });
      
      newChartData.push({
        name: timestamp.toLocaleTimeString(),
        cpu,
        memory: memory / 10, // Scale down for the chart
        fps,
        loadTime: loadTime / 10 // Scale down for the chart
      });
    }
    
    setTimeout(() => {
      setMetrics(newMetrics);
      setChartData(newChartData);
      setIsLoading(false);
    }, 500);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // Initial data load
  useEffect(() => {
    generateMockData();
  }, []);

  const downloadData = () => {
    const content = JSON.stringify(metrics, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculate averages
  const averageCPU = Math.round(metrics.reduce((sum, metric) => sum + metric.cpu, 0) / (metrics.length || 1));
  const averageMemory = Math.round(metrics.reduce((sum, metric) => sum + metric.memory, 0) / (metrics.length || 1));
  const averageFPS = Math.round(metrics.reduce((sum, metric) => sum + metric.fps, 0) / (metrics.length || 1));
  const averageLoadTime = Math.round(metrics.reduce((sum, metric) => sum + metric.loadTime, 0) / (metrics.length || 1));

  return (
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateMockData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={downloadData} disabled={metrics.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant={isRecording ? "destructive" : "default"} 
              onClick={toggleRecording}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Cpu className="h-4 w-4 mr-2 text-blue-500" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageCPU}%</div>
              <Progress value={averageCPU} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2 text-green-500" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageMemory} MB</div>
              <Progress value={averageMemory / 10} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart className="h-4 w-4 mr-2 text-yellow-500" />
                Average FPS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageFPS}</div>
              <Progress value={averageFPS} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-purple-500" />
                Page Load Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageLoadTime} ms</div>
              <Progress value={averageLoadTime / 10} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
            <TabsTrigger value="charts">Performance Charts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Detailed Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="p-4 hover:bg-muted/20">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {metric.timestamp.toLocaleString()}
                            </span>
                          </div>
                          <Badge variant={metric.cpu > 50 ? "destructive" : "outline"}>
                            CPU: {metric.cpu}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Memory:</span>
                            <span className="text-sm font-medium">{metric.memory} MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">FPS:</span>
                            <span className="text-sm font-medium">{metric.fps}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Load Time:</span>
                            <span className="text-sm font-medium">{metric.loadTime} ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Network Requests:</span>
                            <span className="text-sm font-medium">{metric.networkRequests}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="charts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Performance Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" />
                      <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory (x10 MB)" />
                      <Line type="monotone" dataKey="fps" stroke="#f59e0b" name="FPS" />
                      <Line type="monotone" dataKey="loadTime" stroke="#8b5cf6" name="Load Time (x10 ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
};

export default PerformanceMonitor;
