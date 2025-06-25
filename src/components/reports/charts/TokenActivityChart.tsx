import React from "react";
import {
  AreaChart,
  Area,
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

interface TokenActivityChartProps {
  data: ChartData[];
  isLoading: boolean;
  error: string | null;
}

const TokenActivityChart: React.FC<TokenActivityChartProps> = ({ data, isLoading, error }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Activity</CardTitle>
        <CardDescription>Transaction volume and count over time</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">Loading Token Activity...</div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>
        ) : (
          <ChartContainer 
            config={{ 
              transactions: { theme: { light: '#0088FE', dark: '#0088FE' } },
              volume: { theme: { light: '#00C49F', dark: '#00C49F' } }
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
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
        )}
      </CardContent>
    </Card>
  );
};

export default TokenActivityChart;