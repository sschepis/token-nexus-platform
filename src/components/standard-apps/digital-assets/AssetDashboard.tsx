import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppComponentProps } from '@/types/app-framework';
import { 
  Gem, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface AssetStats {
  totalAssets: number;
  totalValue: number;
  activeListings: number;
  totalSales: number;
  royaltiesEarned: number;
  uniqueOwners: number;
}

interface Asset {
  id: string;
  name: string;
  description: string;
  image: string;
  tokenStandard: 'ERC721' | 'ERC1155' | 'ERC20';
  price: number;
  currency: string;
  owner: string;
  creator: string;
  royalty: number;
  status: 'minted' | 'listed' | 'sold' | 'transferred';
  createdAt: string;
  lastSale?: {
    price: number;
    currency: string;
    date: string;
  };
}

interface Collection {
  id: string;
  name: string;
  description: string;
  image: string;
  totalAssets: number;
  floorPrice: number;
  volume: number;
  owners: number;
}

export function AssetDashboard({ appId, config, organization, user, permissions }: AppComponentProps) {
  const [stats, setStats] = useState<AssetStats>({
    totalAssets: 0,
    totalValue: 0,
    activeListings: 0,
    totalSales: 0,
    royaltiesEarned: 0,
    uniqueOwners: 0
  });

  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [topCollections, setTopCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // In a real implementation, this would call Parse Cloud Functions
      // For now, we'll use mock data
      setStats({
        totalAssets: 2847,
        totalValue: 156780.50,
        activeListings: 342,
        totalSales: 1205,
        royaltiesEarned: 8934.25,
        uniqueOwners: 1456
      });

      setRecentAssets([
        {
          id: '1',
          name: 'Digital Artwork #001',
          description: 'A beautiful digital artwork',
          image: '/api/placeholder/150/150',
          tokenStandard: 'ERC721',
          price: 0.5,
          currency: 'ETH',
          owner: '0x1234...5678',
          creator: '0xabcd...efgh',
          royalty: 10,
          status: 'listed',
          createdAt: '2024-01-15T10:30:00Z',
          lastSale: {
            price: 0.3,
            currency: 'ETH',
            date: '2024-01-10T15:20:00Z'
          }
        },
        {
          id: '2',
          name: 'Collectible Token #042',
          description: 'Rare collectible token',
          image: '/api/placeholder/150/150',
          tokenStandard: 'ERC1155',
          price: 1.2,
          currency: 'ETH',
          owner: '0x5678...9012',
          creator: '0xefgh...ijkl',
          royalty: 5,
          status: 'minted',
          createdAt: '2024-01-14T14:15:00Z'
        }
      ]);

      setTopCollections([
        {
          id: '1',
          name: 'Digital Art Collection',
          description: 'Premium digital artworks',
          image: '/api/placeholder/100/100',
          totalAssets: 150,
          floorPrice: 0.1,
          volume: 45.6,
          owners: 89
        },
        {
          id: '2',
          name: 'Gaming Assets',
          description: 'In-game items and characters',
          image: '/api/placeholder/100/100',
          totalAssets: 500,
          floorPrice: 0.05,
          volume: 78.9,
          owners: 234
        }
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Asset['status']) => {
    switch (status) {
      case 'minted':
        return <Badge variant="secondary">Minted</Badge>;
      case 'listed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Listed</Badge>;
      case 'sold':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sold</Badge>;
      case 'transferred':
        return <Badge variant="outline">Transferred</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price.toFixed(4)} ${currency}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Digital Asset Management</h1>
          <p className="text-gray-600">Manage your digital assets, NFTs, and marketplace listings</p>
        </div>
        <div className="flex gap-2">
          {permissions?.includes('assets:write') && (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Asset
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Gem className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssets.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Portfolio value in USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeListings}</div>
            <p className="text-xs text-muted-foreground">
              Currently for sale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Royalties Earned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.royaltiesEarned.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From secondary sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Recent Assets</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Assets</CardTitle>
                  <CardDescription>
                    Your latest digital assets and NFTs
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search assets..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-shrink-0">
                      <img
                        src={asset.image}
                        alt={asset.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {asset.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {asset.tokenStandard}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {asset.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          Owner: {formatAddress(asset.owner)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Royalty: {asset.royalty}%
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-medium">
                        {formatPrice(asset.price, asset.currency)}
                      </div>
                      {asset.lastSale && (
                        <div className="text-xs text-gray-500">
                          Last: {formatPrice(asset.lastSale.price, asset.lastSale.currency)}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(asset.status)}
                    </div>
                    <div className="flex-shrink-0">
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Collections</CardTitle>
              <CardDescription>
                Your most valuable asset collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topCollections.map((collection) => (
                  <div key={collection.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src={collection.image}
                        alt={collection.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{collection.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{collection.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Assets:</span>
                        <span className="font-medium">{collection.totalAssets}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Floor Price:</span>
                        <span className="font-medium">{collection.floorPrice} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Volume:</span>
                        <span className="font-medium">{collection.volume} ETH</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Owners:</span>
                        <span className="font-medium">{collection.owners}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Activity</CardTitle>
              <CardDescription>
                Recent marketplace transactions and listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                <p>Marketplace activity interface</p>
                <p className="text-sm">View and manage marketplace listings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Performance</CardTitle>
                <CardDescription>
                  Track your asset values over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                  <p>Performance chart placeholder</p>
                  <p className="text-sm">Asset value trends and analytics</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Royalty Earnings</CardTitle>
                <CardDescription>
                  Monthly royalty income breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>This Month</span>
                      <span className="font-medium">$2,456.78</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Last Month</span>
                      <span className="font-medium">$1,892.34</span>
                    </div>
                    <Progress value={58} className="h-2" />
                  </div>
                  <div className="text-sm text-gray-600">
                    +30% increase from last month
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}