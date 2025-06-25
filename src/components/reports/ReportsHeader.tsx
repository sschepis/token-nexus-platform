import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Loader2, Zap } from "lucide-react";

interface ReportsHeaderProps {
  timeRange: string;
  setTimeRange: (value: string) => void;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
  canReadAnalytics: boolean;
  canWrite: boolean;
  pageController?: {
    isRegistered: boolean;
    getAvailableActions: () => any[];
  };
}

const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  timeRange,
  setTimeRange,
  onRefresh,
  isLoading,
  canReadAnalytics,
  canWrite,
  pageController
}) => {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track platform usage, monitor performance metrics, and visualize data
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {pageController?.isRegistered && (
          <div className="flex items-center gap-2 mr-2">
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {pageController.getAvailableActions().length} AI actions
            </Badge>
          </div>
        )}
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
        {canReadAnalytics && (
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
        )}
        {canWrite && (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReportsHeader;