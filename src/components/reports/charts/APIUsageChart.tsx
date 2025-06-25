import React from "react";
import {
  BarChart,
  Bar,
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

interface APIUsageChartProps {
  data: ChartData[];
  isLoading: boolean;
  error: string | null;
}

const APIUsageChart: React.FC<APIUsageChartProps> = ({ data, isLoading, error }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Usage</CardTitle>
        <CardDescription>Read and write operations over time</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">Loading API Usage...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>
        ) : (
          <ChartContainer
            config={{ 
              reads: { theme: { light: '#8884d8', dark: '#8884d8' } },
              writes: { theme: { light: '#82ca9d', dark: '#82ca9d' } } 
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
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
  );
};

export default APIUsageChart;