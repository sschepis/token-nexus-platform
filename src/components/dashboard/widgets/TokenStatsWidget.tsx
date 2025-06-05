
import React, { useEffect, useState } from 'react';
import { apiService, mockApis } from "@/services/api";
import { Token } from '@/store/slices/tokenSlice';
import { DollarSign, ChevronUp, ChevronDown } from 'lucide-react';

interface TokenStatsWidgetProps {
  id: string;
  config?: Record<string, any>;
}

export const TokenStatsWidget: React.FC<TokenStatsWidgetProps> = ({ id, config }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.getTokens();
        setTokens(response.data.tokens);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate metrics
  const totalTokens = tokens.length;
  const confirmedTokens = tokens.filter(token => token.status === 'confirmed').length;
  const pendingTokens = tokens.filter(token => token.status === 'pending').length;
  const totalSupply = tokens.reduce((sum, token) => sum + token.supply, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 p-4 rounded-md flex flex-col">
          <div className="text-xs text-muted-foreground mb-1">Total Tokens</div>
          <div className="text-2xl font-bold">{isLoading ? '...' : totalTokens}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {confirmedTokens} confirmed, {pendingTokens} pending
          </div>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-md flex flex-col">
          <div className="text-xs text-muted-foreground mb-1">Total Supply</div>
          <div className="text-2xl font-bold">{isLoading ? '...' : totalSupply.toLocaleString()}</div>
          <div className="text-xs text-green-500 mt-1 flex items-center">
            <ChevronUp className="h-3 w-3" />
            <span>5% growth</span>
          </div>
        </div>
      </div>
    </div>
  );
};
