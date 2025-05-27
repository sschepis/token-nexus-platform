import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, TrendingUp, Users, Package } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import Parse from 'parse';

interface ChartWidgetProps {
  id: string;
  config?: Record<string, unknown>;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

type ChartType = 'userGrowth' | 'tokenActivity' | 'appUsage';
type ChartDisplay = 'bar' | 'line' | 'area';
type Period = '7d' | '30d' | '90d';

const chartTypeOptions = [
  { value: 'userGrowth', label: 'User Growth', icon: Users },
  { value: 'tokenActivity', label: 'Token Activity', icon: Package },
  { value: 'appUsage', label: 'App Usage', icon: TrendingUp },
];

const periodOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export const ChartWidget: React.FC<ChartWidgetProps> = ({ id, config = {} }) => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [chartType, setChartType] = useState<ChartType>((config.chartType as ChartType) || 'userGrowth');
  const [displayType, setDisplayType] = useState<ChartDisplay>('line');
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchChartData = useCallback(async () => {
    if (!currentOrg?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await Parse.Cloud.run('getDashboardChartData', {
        organizationId: currentOrg.id,
        chartType,
        period
      });

      if (result.success && result.data) {
        // Format data for display
        const formattedData = result.data.map((point: ChartDataPoint) => ({
          ...point,
          label: formatDateLabel(point.date, period)
        }));
        setData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setError('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg?.id, chartType, period]);

  useEffect(() => {
    fetchChartData();
  }, [currentOrg?.id, chartType, period, fetchChartData]);

  const formatDateLabel = (dateStr: string, period: Period) => {
    const date = new Date(dateStr);
    if (period === '7d') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (period === '30d') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getChartTitle = () => {
    const chartConfig = chartTypeOptions.find(opt => opt.value === chartType);
    return chartConfig?.label || 'Chart';
  };

  const getChartColor = () => {
    switch (chartType) {
      case 'userGrowth':
        return '#3b82f6'; // blue
      case 'tokenActivity':
        return '#10b981'; // green
      case 'appUsage':
        return '#8b5cf6'; // purple
      default:
        return '#6366f1'; // indigo
    }
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[220px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
          {error}
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
          No data available
        </div>
      );
    }

    const color = getChartColor();

    switch(displayType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                dot={{ fill: color, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                fill={color}
                fillOpacity={0.1}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const ChartIcon = chartTypeOptions.find(opt => opt.value === chartType)?.icon || TrendingUp;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{getChartTitle()}</h3>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
          <SelectTrigger className="w-[120px] h-8">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
          <SelectTrigger className="flex-1 h-8">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            {chartTypeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <option.icon className="h-3 w-3" />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex">
          <Button 
            variant={displayType === 'line' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDisplayType('line')}
            className="text-xs rounded-r-none"
          >
            Line
          </Button>
          <Button 
            variant={displayType === 'bar' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDisplayType('bar')}
            className="text-xs rounded-none border-x-0"
          >
            Bar
          </Button>
          <Button 
            variant={displayType === 'area' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setDisplayType('area')}
            className="text-xs rounded-l-none"
          >
            Area
          </Button>
        </div>
      </div>
      
      {renderChart()}
      
      {!isLoading && !error && data.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {data[data.length - 1]?.value || 0} total as of {formatDateLabel(data[data.length - 1]?.date || '', period)}
        </div>
      )}
    </div>
  );
};
