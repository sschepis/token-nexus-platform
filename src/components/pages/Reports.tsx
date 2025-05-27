
import React, { useState } from "react";
// import AppLayout from "@/components/layout/AppLayout"; // Removed AppLayout import
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
import { Download } from "lucide-react";

const Reports = () => {
  const [timeRange, setTimeRange] = useState("30d");

  // Mock data
  const tokenActivityData = [
    { date: "May 1", transactions: 65, volume: 15000, users: 24 },
    { date: "May 5", transactions: 78, volume: 18500, users: 27 },
    { date: "May 10", transactions: 90, volume: 20000, users: 32 },
    { date: "May 15", transactions: 81, volume: 17500, users: 29 },
    { date: "May 20", transactions: 95, volume: 22000, users: 35 },
    { date: "May 25", transactions: 110, volume: 25000, users: 40 },
    { date: "May 30", transactions: 102, volume: 23000, users: 38 },
  ];

  const userActivityData = [
    { date: "May 1", active: 42, new: 5 },
    { date: "May 5", active: 45, new: 3 },
    { date: "May 10", active: 48, new: 4 },
    { date: "May 15", active: 51, new: 2 },
    { date: "May 20", active: 54, new: 6 },
    { date: "May 25", active: 58, new: 4 },
    { date: "May 30", active: 62, new: 5 },
  ];

  const transactionsByTypeData = [
    { name: "Transfer", value: 400 },
    { name: "Issuance", value: 300 },
    { name: "Redemption", value: 200 },
    { name: "Other", value: 100 },
  ];

  const usersByRoleData = [
    { name: "Admin", value: 10 },
    { name: "Manager", value: 25 },
    { name: "User", value: 65 },
  ];

  const apiUsageData = [
    { date: "May 1", reads: 150, writes: 30 },
    { date: "May 5", reads: 170, writes: 35 },
    { date: "May 10", reads: 185, writes: 40 },
    { date: "May 15", reads: 210, writes: 45 },
    { date: "May 20", reads: 230, writes: 50 },
    { date: "May 25", reads: 250, writes: 55 },
    { date: "May 30", reads: 270, writes: 60 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    // <AppLayout> // Removed AppLayout wrapper; _app.tsx handles it.
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track platform usage, monitor performance metrics, and visualize data
            </p>
          </div>
          <div className="flex items-center space-x-2">
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
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>Active users and new user registrations</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transactions by Type</CardTitle>
                  <CardDescription>Distribution of transaction types</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Users by Role</CardTitle>
                  <CardDescription>Distribution of user roles</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
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
                <p className="text-muted-foreground">Custom report builder is coming soon. This feature will allow you to create and save custom reports with your preferred metrics and visualizations.</p>
                <Button className="mt-4" disabled>Create Custom Report</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Data Export</CardTitle>
                <CardDescription>Export your data for offline analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Users (CSV)
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Tokens (CSV)
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Transactions (CSV)
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Audit Logs (CSV)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    // </AppLayout>
  );
};

export default Reports;
