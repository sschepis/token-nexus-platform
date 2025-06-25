import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { ChartData } from "../types";

interface UserActivityChartProps {
  data: ChartData[];
  isLoading: boolean;
  error: string | null;
}

const UserActivityChart: React.FC<UserActivityChartProps> = ({ data, isLoading, error }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Activity</CardTitle>
        <CardDescription>Active users and new user registrations</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">Loading User Activity...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>
        ) : (
          <ChartContainer 
            config={{ 
              active: { theme: { light: '#8884d8', dark: '#8884d8' } },
              new: { theme: { light: '#82ca9d', dark: '#82ca9d' } } 
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
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
  );
};

export default UserActivityChart;