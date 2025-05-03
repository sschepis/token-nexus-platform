
import React from "react";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface ChartPreviewProps {
  width?: number;
  height?: number;
  data: {
    category: string;
    values: {
      key: string;
      value: number;
    }[];
  }[];
  keys?: string[];
}

const COLORS = [
  "var(--chart-color-1, #2563eb)", // blue
  "var(--chart-color-2, #16a34a)", // green
  "var(--chart-color-3, #ea580c)", // orange
  "var(--chart-color-4, #dc2626)", // red
  "var(--chart-color-5, #7c3aed)", // purple
  "var(--chart-color-6, #0891b2)", // cyan
];

const ChartPreview = ({
  width = 500,
  height = 300,
  data,
  keys,
}: ChartPreviewProps) => {
  // Transform data for recharts
  const transformedData = data[0]?.values.map((item) => {
    const result: Record<string, any> = {
      name: item.key,
    };
    
    result[data[0].category] = item.value;
    return result;
  }) || [];

  // Create config for chart container
  const chartConfig: ChartConfig = {};
  (keys || []).forEach((key, index) => {
    chartConfig[key] = {
      label: key,
      color: COLORS[index % COLORS.length],
    };
  });

  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
      <BarChart
        data={transformedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        <Bar
          dataKey={data[0]?.category || ""}
          fill={COLORS[0]}
          name={data[0]?.category || ""}
        />
      </BarChart>
    </ChartContainer>
  );
};

export default ChartPreview;
