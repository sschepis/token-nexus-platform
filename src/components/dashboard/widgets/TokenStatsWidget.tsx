
import React, { useEffect, useState } from 'react';
import { apiService } from "@/services/api";
import { Token } from '@/store/slices/tokenSlice';
import { DollarSign, ChevronUp, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TokenStatsWidgetProps {
  id: string;
  config?: Record<string, any>;
}

interface TokenMetrics {
  totalTokens: number;
  confirmedTokens: number;
  pendingTokens: number;
  failedTokens: number;
  totalSupply: number;
  averageSupply: number;
  growthRate: number;
  lastUpdated: string;
}

export const TokenStatsWidget: React.FC<TokenStatsWidgetProps> = ({ id, config }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await apiService.getTokens();
        
        if (!response.data || !Array.isArray(response.data.tokens)) {
          throw new Error('Invalid token data received');
        }

        const tokenData = response.data.tokens;
        setTokens(tokenData);

        // Calculate real metrics
        const totalTokens = tokenData.length;
        const confirmedTokens = tokenData.filter(token => token.status === 'confirmed').length;
        const pendingTokens = tokenData.filter(token => token.status === 'pending').length;
        const failedTokens = tokenData.filter(token => token.status === 'failed').length;
        
        // Validate supply values and calculate totals
        const validTokens = tokenData.filter(token =>
          typeof token.supply === 'number' &&
          !isNaN(token.supply) &&
          token.supply >= 0
        );
        
        const totalSupply = validTokens.reduce((sum, token) => sum + token.supply, 0);
        const averageSupply = validTokens.length > 0 ? totalSupply / validTokens.length : 0;

        // Calculate growth rate (simplified - in real app, compare with historical data)
        const recentTokens = tokenData.filter(token => {
          const tokenDate = new Date(token.createdAt || token.updatedAt || Date.now());
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return tokenDate > weekAgo;
        });
        
        const growthRate = totalTokens > 0 ? (recentTokens.length / totalTokens) * 100 : 0;

        setMetrics({
          totalTokens,
          confirmedTokens,
          pendingTokens,
          failedTokens,
          totalSupply,
          averageSupply,
          growthRate,
          lastUpdated: new Date().toISOString()
        });

      } catch (error) {
        console.error("Failed to fetch tokens:", error);
        setError(error instanceof Error ? error.message : 'Failed to load token data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading token stats...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No token data available</AlertDescription>
      </Alert>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getGrowthColor = (rate: number): string => {
    if (rate > 0) return 'text-green-500';
    if (rate < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getGrowthIcon = (rate: number) => {
    if (rate > 0) return <ChevronUp className="h-3 w-3" />;
    if (rate < 0) return <ChevronDown className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 p-4 rounded-md flex flex-col">
          <div className="text-xs text-muted-foreground mb-1">Total Tokens</div>
          <div className="text-2xl font-bold">{metrics.totalTokens}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {metrics.confirmedTokens} confirmed, {metrics.pendingTokens} pending
            {metrics.failedTokens > 0 && `, ${metrics.failedTokens} failed`}
          </div>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-md flex flex-col">
          <div className="text-xs text-muted-foreground mb-1">Total Supply</div>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalSupply)}</div>
          <div className={`text-xs mt-1 flex items-center ${getGrowthColor(metrics.growthRate)}`}>
            {getGrowthIcon(metrics.growthRate)}
            <span>{Math.abs(metrics.growthRate).toFixed(1)}% weekly growth</span>
          </div>
        </div>
      </div>
      
      {metrics.totalTokens > 0 && (
        <div className="bg-muted/50 p-4 rounded-md">
          <div className="text-xs text-muted-foreground mb-1">Average Supply per Token</div>
          <div className="text-lg font-semibold">{formatNumber(metrics.averageSupply)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};
