import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Package, 
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  RefreshCw,
  Eye,
  Edit,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { useToast } from '@/hooks/use-toast';

interface DiamondData {
  diamond: any;
  activeFacets: any[];
  facetCount: number;
  isNew: boolean;
  message: string;
}

interface FacetManagerProps {
  diamondData: DiamondData;
  onFacetRemoved: () => void;
  onRefresh: () => void;
}

export const FacetManager: React.FC<FacetManagerProps> = ({
  diamondData,
  onFacetRemoved,
  onRefresh
}) => {
  const { executeAction, isLoading } = useActionExecutor();
  const { toast } = useToast();
  
  const [removingFacets, setRemovingFacets] = useState<Set<string>>(new Set());
  const [facetToRemove, setFacetToRemove] = useState<any>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedFacet, setSelectedFacet] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const handleRemoveFacet = async (facetInstanceId: string, facetName: string) => {
    try {
      setRemovingFacets(prev => new Set(prev).add(facetInstanceId));
      
      await executeAction('smart-contract-studio', 'removeFacet', {
        facetInstanceId
      });

      toast({
        title: "Facet Removed",
        description: `${facetName} has been successfully removed from your diamond contract.`,
      });

      onFacetRemoved();
      setShowRemoveDialog(false);
      setFacetToRemove(null);
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : 'Failed to remove facet',
        variant: "destructive",
      });
    } finally {
      setRemovingFacets(prev => {
        const newSet = new Set(prev);
        newSet.delete(facetInstanceId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'installing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'removing':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'installing':
        return 'bg-yellow-100 text-yellow-800';
      case 'removing':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'token':
        return <Package className="h-4 w-4 text-yellow-500" />;
      case 'identity':
        return <Package className="h-4 w-4 text-blue-500" />;
      case 'marketplace':
        return <Package className="h-4 w-4 text-green-500" />;
      case 'governance':
        return <Package className="h-4 w-4 text-purple-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
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

  const openRemoveDialog = (facet: any) => {
    setFacetToRemove(facet);
    setShowRemoveDialog(true);
  };

  const openDetailsDialog = (facet: any) => {
    setSelectedFacet(facet);
    setShowDetailsDialog(true);
  };

  const { activeFacets, facetCount } = diamondData;

  // Separate core and custom facets
  const coreFacets = activeFacets.filter(facet => facet.isCore);
  const customFacets = activeFacets.filter(facet => !facet.isCore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Facet Manager</h2>
          <p className="text-gray-600">
            Manage installed facets on your diamond contract
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Core Facets</p>
                <p className="text-2xl font-bold">{coreFacets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Custom Facets</p>
                <p className="text-2xl font-bold">{customFacets.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeFacets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Facets Installed</h3>
            <p className="text-gray-600">
              Install facets from the marketplace to add functionality to your diamond contract.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Core Facets */}
          {coreFacets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span>Core Facets ({coreFacets.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Core facets are essential for diamond functionality and cannot be removed.
                  </AlertDescription>
                </Alert>
                <div className="space-y-3">
                  {coreFacets.map((facet, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon('core')}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{facet.name || 'Unknown Facet'}</h4>
                            <Badge variant="secondary">Core</Badge>
                            <Badge className={getStatusColor(facet.status)}>
                              {facet.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {facet.installedAt && `Installed ${formatDate(facet.installedAt)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(facet.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog(facet)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Custom Facets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-green-600" />
                <span>Custom Facets ({customFacets.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customFacets.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No custom facets installed</p>
                  <p className="text-sm text-gray-400">Install facets from the marketplace to extend functionality</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customFacets.map((facet, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getCategoryIcon(facet.category || 'utility')}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{facet.name || 'Unknown Facet'}</h4>
                            {facet.category && (
                              <Badge variant="outline" className="capitalize">
                                {facet.category}
                              </Badge>
                            )}
                            <Badge className={getStatusColor(facet.status)}>
                              {facet.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {facet.installedAt && `Installed ${formatDate(facet.installedAt)}`}
                            {facet.installedBy && ` by ${facet.installedBy}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(facet.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailsDialog(facet)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openRemoveDialog(facet)}
                              disabled={facet.status !== 'active' || removingFacets.has(facet.objectId)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Facet
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Remove Facet</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{facetToRemove?.name}</strong> from your diamond contract? 
              This action cannot be undone and will remove all functionality provided by this facet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => facetToRemove && handleRemoveFacet(facetToRemove.objectId, facetToRemove.name)}
              disabled={removingFacets.has(facetToRemove?.objectId)}
            >
              {removingFacets.has(facetToRemove?.objectId) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Facet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facet Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedFacet && getCategoryIcon(selectedFacet.category || 'utility')}
              <span>{selectedFacet?.name || 'Facet Details'}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedFacet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedFacet.status)}
                    <Badge className={getStatusColor(selectedFacet.status)}>
                      {selectedFacet.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {selectedFacet.category || 'Unknown'}
                  </p>
                </div>
              </div>
              
              {selectedFacet.installedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Installed</label>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(selectedFacet.installedAt)}
                  </p>
                </div>
              )}

              {selectedFacet.configuration && Object.keys(selectedFacet.configuration).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Configuration</label>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(selectedFacet.configuration, null, 2)}
                  </pre>
                </div>
              )}

              {selectedFacet.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {selectedFacet.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};