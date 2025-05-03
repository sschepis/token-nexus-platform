
import React, { useState } from 'react';
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

interface ChartWidgetProps {
  id: string;
  config?: Record<string, any>;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ id, config = {} }) => {
  const [chartType, setChartType] = useState(config.chartType || 'bar');
  
  // Sample data - in a real app this would come from an API
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 },
    { name: 'Jun', value: 900 }
  ];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  const renderChart = () => {
    switch(chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div>Unsupported chart type</div>;
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex space-x-2 pb-2">
        <Button 
          variant={chartType === 'bar' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setChartType('bar')}
          className="text-xs"
        >
          Bar
        </Button>
        <Button 
          variant={chartType === 'line' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setChartType('line')}
          className="text-xs"
        >
          Line
        </Button>
        <Button 
          variant={chartType === 'pie' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setChartType('pie')}
          className="text-xs"
        >
          Pie
        </Button>
      </div>
      
      {renderChart()}
      
      <div className="text-xs text-muted-foreground text-center pt-2">
        Sample data visualization
      </div>
    </div>
  );
};
