
import React, { useEffect, useState } from 'react';
import { mockApis } from "@/services/api";
import { Token } from '@/store/slices/tokenSlice';

interface RecentTokensWidgetProps {
  id: string;
  config?: Record<string, any>;
}

export const RecentTokensWidget: React.FC<RecentTokensWidgetProps> = ({ id, config }) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const limit = config?.limit || 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await mockApis.getTokens();
        setTokens(response.data.tokens);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded"></div>
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No tokens created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tokens.slice(0, limit).map((token) => (
        <div key={token.id} className="flex items-center gap-4 py-2">
          <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center">
            <span className="font-semibold text-primary">{token.symbol?.[0] || token.name[0]}</span>
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{token.name}</h4>
            <p className="text-sm text-muted-foreground">{token.symbol} • {token.blockchain}</p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs ${
            token.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
            token.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
          </div>
        </div>
      ))}
    </div>
  );
};
