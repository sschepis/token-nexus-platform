import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useNavigate } from 'react-router-dom';
import Parse from 'parse';

interface RecentTokensWidgetProps {
  id: string;
  config?: Record<string, unknown>;
}

interface Token {
  id: string;
  name: string;
  symbol: string;
  totalSupply: string;
  status: 'draft' | 'pending' | 'deployed' | 'failed';
  deploymentNetwork?: string;
  contractAddress?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    email: string;
    name: string;
  };
}

export const RecentTokensWidget: React.FC<RecentTokensWidgetProps> = ({ id, config }) => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const fetchRecentTokens = useCallback(async () => {
    if (!currentOrg?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await Parse.Cloud.run('getRecentTokens', {
        organizationId: currentOrg.id,
        limit: 5
      });

      if (result.success && result.tokens) {
        setTokens(result.tokens);
      }
    } catch (error) {
      console.error('Error fetching recent tokens:', error);
      setError('Failed to load recent tokens');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    fetchRecentTokens();
  }, [fetchRecentTokens]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatSupply = (supply: string) => {
    const num = parseFloat(supply);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(0);
  };

  const getRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleTokenClick = (tokenId: string) => {
    navigate(`/tokens/${tokenId}`);
  };

  const viewAllTokens = () => {
    navigate('/tokens');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-2">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Coins className="h-12 w-12 text-muted-foreground/50" />
        <div className="text-center">
          <p className="text-sm font-medium">No tokens yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first token to get started
          </p>
        </div>
        <button
          onClick={() => navigate('/tokens/create')}
          className="text-xs text-primary hover:underline"
        >
          Create Token
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tokens.map((token) => (
        <Card 
          key={token.id} 
          className="p-3 cursor-pointer hover:bg-accent/5 transition-colors"
          onClick={() => handleTokenClick(token.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{token.name}</h4>
                <Badge variant={getStatusColor(token.status)} className="text-xs">
                  {token.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-muted-foreground">{token.symbol}</span>
                <span className="text-xs text-muted-foreground">
                  Supply: {formatSupply(token.totalSupply)}
                </span>
              </div>
              {token.deploymentNetwork && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {token.deploymentNetwork}
                  </span>
                  {token.contractAddress && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Created {getRelativeTime(token.createdAt)}
                {token.createdBy && ` by ${token.createdBy.name || token.createdBy.email}`}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </Card>
      ))}
      
      <button
        onClick={viewAllTokens}
        className="w-full text-center text-sm text-primary hover:underline py-2"
      >
        View All Tokens
      </button>
    </div>
  );
};
