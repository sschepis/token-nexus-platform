import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Package, 
  Search, 
  Filter,
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Shield,
  Coins,
  Users,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceData {
  facets: any[];
  categories: string[];
  total: number;
  installedCount: number;
}

interface FacetMarketplaceProps {
  marketplaceData: MarketplaceData | null;
  onFacetInstalled: () => void;
  onRefresh: () => void;
}

export const FacetMarketplace: React.FC<FacetMarketplaceProps> = ({
  marketplaceData,
  onFacetInstalled,
  onRefresh
}) => {
  const { executeAction, isLoading } = useActionExecutor();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showInstalled, setShowInstalled] = useState(true);
  const [installingFacets, setInstallingFacets] = useState<Set<string>>(new Set());

  const handleInstallFacet = async (facetId: string, facetName: string) => {
    try {
      setInstallingFacets(prev => new Set(prev).add(facetId));
      
      await executeAction('smart-contract-studio', 'installFacet', {
        facetId,
        configuration: {}
      });

      toast({
        title: "Facet Installed",
        description: `${facetName} has been successfully installed to your diamond contract.`,
      });

      onFacetInstalled();
    } catch (error) {
      toast({
        title: "Installation Failed",
        description: error instanceof Error ? error.message : 'Failed to install facet',
        variant: "destructive",
      });
    } finally {
      setInstallingFacets(prev => {
        const newSet = new Set(prev);
        newSet.delete(facetId);
        return newSet;
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'token':
        return <Coins className="h-4 w-4" />;
      case 'identity':
        return <Users className="h-4 w-4" />;
      case 'marketplace':
        return <Package className="h-4 w-4" />;
      case 'governance':
        return <Shield className="h-4 w-4" />;
      case 'core':
        return <Settings className="h-4 w-4" />;
      case 'utility':
        return <Zap className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'token':
        return 'bg-yellow-100 text-yellow-800';
      case 'identity':
        return 'bg-blue-100 text-blue-800';
      case 'marketplace':
        return 'bg-green-100 text-green-800';
      case 'governance':
        return 'bg-purple-100 text-purple-800';
      case 'core':
        return 'bg-red-100 text-red-800';
      case 'utility':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompatibilityIcon = (compatibility: { compatible: boolean; reason?: string }) => {
    if (compatibility.compatible) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Filter facets based on search and category
  const filteredFacets = marketplaceData?.facets.filter(facet => {
    const matchesSearch = facet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facet.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || facet.category === selectedCategory;
    const matchesInstalled = showInstalled || !facet.isInstalled;
    
    return matchesSearch && matchesCategory && matchesInstalled;
  }) || [];

  if (!marketplaceData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading Marketplace</h3>
          <p className="text-gray-600">Fetching available facets...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facet Marketplace</h2>
          <p className="text-gray-600">
            Browse and install facets to extend your diamond contract functionality
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search facets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {marketplaceData.categories.map(category => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize">{category}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showInstalled ? "default" : "outline"}
              onClick={() => setShowInstalled(!showInstalled)}
              className="w-full sm:w-auto"
            >
              {showInstalled ? "Hide Installed" : "Show Installed"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Facets</p>
                <p className="text-2xl font-bold">{marketplaceData.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Installed</p>
                <p className="text-2xl font-bold">{marketplaceData.installedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold">{marketplaceData.categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Filtered</p>
                <p className="text-2xl font-bold">{filteredFacets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facet Grid */}
      {filteredFacets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Facets Found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'No facets are available in the marketplace'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacets.map((facet, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      {getCategoryIcon(facet.category)}
                      <span>{facet.name}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={getCategoryColor(facet.category)}>
                        {facet.category}
                      </Badge>
                      {facet.isInstalled && (
                        <Badge variant="default">Installed</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getCompatibilityIcon(facet.compatibility)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-gray-600 mb-4 flex-1">
                  {facet.description || 'No description available'}
                </p>
                
                {!facet.compatibility.compatible && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {facet.compatibility.reason}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 mb-4">
                  {facet.abi && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Functions:</span>
                      <span>{facet.abi.filter((item: any) => item.type === 'function').length}</span>
                    </div>
                  )}
                  {facet.blockchain && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Network:</span>
                      <span>{facet.blockchain}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {facet.isInstalled ? (
                    <Button variant="secondary" disabled className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Installed
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleInstallFacet(facet.objectId, facet.name)}
                      disabled={!facet.compatibility.compatible || installingFacets.has(facet.objectId)}
                      className="flex-1"
                    >
                      {installingFacets.has(facet.objectId) ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Install
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};