import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Diamond, 
  Plus, 
  Settings, 
  Activity, 
  Package, 
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { DiamondOverview } from './DiamondOverview';
import { FacetMarketplace } from './FacetMarketplace';
import { FacetManager } from './FacetManager';
import { DeploymentWizard } from './DeploymentWizard';

interface DiamondData {
  diamond: any;
  activeFacets: any[];
  facetCount: number;
  isNew: boolean;
  message: string;
}

interface MarketplaceData {
  facets: any[];
  categories: string[];
  total: number;
  installedCount: number;
}

export const SmartContractStudioDashboard: React.FC = () => {
  const { currentOrg } = useOrganizationContext();
  const { executeAction, isLoading } = useActionExecutor();
  
  const [diamondData, setDiamondData] = useState<DiamondData | null>(null);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeploymentWizard, setShowDeploymentWizard] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load diamond data
  const loadDiamondData = async () => {
    if (!currentOrg?.id) return;

    try {
      setError(null);
      const result = await executeAction('smart-contract-studio', 'getOrganizationDiamond', {});
      setDiamondData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diamond data');
    }
  };

  // Load marketplace data
  const loadMarketplaceData = async () => {
    if (!currentOrg?.id) return;

    try {
      const result = await executeAction('smart-contract-studio', 'listAvailableFacets', {
        includeInstalled: true
      });
      setMarketplaceData(result.data);
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    }
  };

  useEffect(() => {
    loadDiamondData();
    loadMarketplaceData();
  }, [currentOrg?.id]);

  const handleCreateDiamond = async () => {
    if (!currentOrg?.id) return;

    try {
      setError(null);
      const result = await executeAction('smart-contract-studio', 'createOrganizationDiamond', {
        blockchain: 'ethereum',
        network: 'sepolia'
      });
      
      // Refresh data after creation
      await loadDiamondData();
      await loadMarketplaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create diamond contract');
    }
  };

  const handleInstallFacet = async (facetId: string) => {
    if (!currentOrg?.id) return;

    try {
      setError(null);
      await executeAction('smart-contract-studio', 'installFacet', {
        facetId
      });
      
      // Refresh data after installation
      await loadDiamondData();
      await loadMarketplaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install facet');
    }
  };

  const handleRemoveFacet = async (facetInstanceId: string) => {
    if (!currentOrg?.id) return;

    try {
      setError(null);
      await executeAction('smart-contract-studio', 'removeFacet', {
        facetInstanceId
      });
      
      // Refresh data after removal
      await loadDiamondData();
      await loadMarketplaceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove facet');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deploying':
      case 'installing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an organization to access Smart Contract Studio.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Diamond className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Smart Contract Studio</h1>
            <p className="text-gray-600">
              Manage your organization's diamond contracts and facets
            </p>
          </div>
        </div>
        
        {diamondData?.diamond && (
          <div className="flex items-center space-x-2">
            {getStatusIcon(diamondData.diamond.status)}
            <Badge variant={diamondData.diamond.status === 'active' ? 'default' : 'secondary'}>
              {diamondData.diamond.status}
            </Badge>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Diamond className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Diamond Status</p>
                <p className="font-semibold">
                  {diamondData?.diamond ? 'Deployed' : 'Not Deployed'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Active Facets</p>
                <p className="font-semibold">{diamondData?.facetCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Available Facets</p>
                <p className="font-semibold">{marketplaceData?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="font-semibold">{marketplaceData?.categories?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {!diamondData?.diamond ? (
        // No Diamond - Show deployment prompt
        <Card>
          <CardContent className="p-8 text-center">
            <Diamond className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Diamond Contract Found</h3>
            <p className="text-gray-600 mb-6">
              Deploy a diamond contract to start managing facets and building your organization's blockchain infrastructure.
            </p>
            <Button onClick={handleCreateDiamond} size="lg" disabled={isLoading}>
              <Plus className="h-4 w-4 mr-2" />
              {isLoading ? 'Deploying...' : 'Deploy Diamond Contract'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Diamond exists - Show management interface
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Diamond Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Diamond Contract</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Contract Address</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1">
                        {diamondData.diamond.contractAddress || 'Deploying...'}
                      </code>
                      {diamondData.diamond.contractAddress && (
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Network</label>
                    <p className="text-sm text-gray-600 mt-1">
                      {diamondData.diamond.blockchain} ({diamondData.diamond.network})
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(diamondData.diamond.status)}
                      <span className="text-sm">{diamondData.diamond.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Facets */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Facets ({diamondData.facetCount})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {diamondData.activeFacets.length === 0 ? (
                      <p className="text-gray-500 text-sm">No facets installed</p>
                    ) : (
                      diamondData.activeFacets.map((facet, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{facet.name || 'Unknown Facet'}</p>
                            <p className="text-xs text-gray-500">{facet.status}</p>
                          </div>
                          {!facet.isCore && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleRemoveFacet(facet.objectId)}
                              disabled={isLoading}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Facet Marketplace</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketplaceData?.facets.length === 0 ? (
                    <p className="text-gray-500">No facets available</p>
                  ) : (
                    marketplaceData?.facets.map((facet, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded">
                        <div>
                          <h4 className="font-medium">{facet.name}</h4>
                          <p className="text-sm text-gray-600">{facet.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="secondary">{facet.category}</Badge>
                            {facet.isInstalled && <Badge variant="default">Installed</Badge>}
                          </div>
                        </div>
                        {!facet.isInstalled && (
                          <Button 
                            onClick={() => handleInstallFacet(facet.objectId)}
                            disabled={isLoading}
                          >
                            Install
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Diamond Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Contract Address</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {diamondData.diamond.contractAddress}
                      </code>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Network</label>
                    <p className="text-sm text-gray-600 mt-1">
                      {diamondData.diamond.blockchain} ({diamondData.diamond.network})
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Danger Zone</h4>
                  <Button variant="destructive" disabled>
                    Pause Diamond Contract
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};