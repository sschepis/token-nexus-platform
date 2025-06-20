import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Diamond, 
  ExternalLink, 
  Copy, 
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Package,
  Activity
} from 'lucide-react';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { useToast } from '@/hooks/use-toast';

interface DiamondData {
  diamond: any;
  activeFacets: any[];
  facetCount: number;
  isNew: boolean;
  message: string;
}

interface DiamondOverviewProps {
  diamondData: DiamondData;
  onRefresh: () => void;
}

export const DiamondOverview: React.FC<DiamondOverviewProps> = ({
  diamondData,
  onRefresh
}) => {
  const { executeAction, isLoading } = useActionExecutor();
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const openInExplorer = (address: string, network: string) => {
    const explorerUrls: Record<string, string> = {
      'mainnet': 'https://etherscan.io',
      'sepolia': 'https://sepolia.etherscan.io',
      'goerli': 'https://goerli.etherscan.io',
      'polygon': 'https://polygonscan.com',
      'mumbai': 'https://mumbai.polygonscan.com'
    };

    const baseUrl = explorerUrls[network] || explorerUrls['sepolia'];
    window.open(`${baseUrl}/address/${address}`, '_blank');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deploying':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'deploying':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { diamond, activeFacets, facetCount } = diamondData;

  return (
    <div className="space-y-6">
      {/* Diamond Contract Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center space-x-2">
              <Diamond className="h-5 w-5 text-blue-600" />
              <span>Diamond Contract</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <div className="flex items-center space-x-2">
                {getStatusIcon(diamond.status)}
                <Badge className={getStatusColor(diamond.status)}>
                  {diamond.status}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Contract Address</label>
              <div className="flex items-center space-x-2 mt-1">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 font-mono">
                  {diamond.contractAddress || 'Deploying...'}
                </code>
                {diamond.contractAddress && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(diamond.contractAddress, 'Contract address')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openInExplorer(diamond.contractAddress, diamond.network)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Network</label>
                <p className="text-sm text-gray-600 mt-1">
                  {diamond.blockchain} ({diamond.network})
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Symbol</label>
                <p className="text-sm text-gray-600 mt-1">
                  {diamond.symbol || 'N/A'}
                </p>
              </div>
            </div>

            {diamond.deployedAt && (
              <div>
                <label className="text-sm font-medium text-gray-700">Deployed</label>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(diamond.deployedAt)}
                </p>
              </div>
            )}

            {diamond.deploymentTxHash && (
              <div>
                <label className="text-sm font-medium text-gray-700">Deployment Transaction</label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 font-mono">
                    {diamond.deploymentTxHash.substring(0, 20)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(diamond.deploymentTxHash, 'Transaction hash')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const explorerUrls: Record<string, string> = {
                        'mainnet': 'https://etherscan.io',
                        'sepolia': 'https://sepolia.etherscan.io',
                        'goerli': 'https://goerli.etherscan.io',
                        'polygon': 'https://polygonscan.com',
                        'mumbai': 'https://mumbai.polygonscan.com'
                      };
                      const baseUrl = explorerUrls[diamond.network] || explorerUrls['sepolia'];
                      window.open(`${baseUrl}/tx/${diamond.deploymentTxHash}`, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facet Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <span>Installed Facets ({facetCount})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeFacets.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No facets installed</p>
                  <p className="text-sm text-gray-400">Install facets from the marketplace to add functionality</p>
                </div>
              ) : (
                activeFacets.map((facet, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm">{facet.name || 'Unknown Facet'}</h4>
                        {facet.isCore && (
                          <Badge variant="secondary" className="text-xs">Core</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Status: {facet.status}
                        {facet.installedAt && ` • Installed ${formatDate(facet.installedAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(facet.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Facets</p>
                <p className="text-2xl font-bold">{facetCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Core Facets</p>
                <p className="text-2xl font-bold">
                  {activeFacets.filter(f => f.isCore).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Custom Facets</p>
                <p className="text-2xl font-bold">
                  {activeFacets.filter(f => !f.isCore).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Diamond className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Contract Size</p>
                <p className="text-2xl font-bold">
                  {diamond.contractAddress ? 'Active' : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};