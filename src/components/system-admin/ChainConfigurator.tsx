import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, AlertTriangle, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Parse from "parse";

interface Network {
  id: string;
  name: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
  chainId?: number;
  isTestnet?: boolean;
  enabled: boolean;
  gasSettings?: Record<string, unknown>;
}

interface ChainConfiguration {
  id: string;
  chainId: string;
  chainName: string;
  displayName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isActive: boolean;
  networks: Network[];
}

export const ChainConfigurator = () => {
  const [configurations, setConfigurations] = useState<ChainConfiguration[]>([]);
  const [activeTab, setActiveTab] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ChainConfiguration | null>(null);
  const [testingRpc, setTestingRpc] = useState<string | null>(null);
  
  // Form state for new network
  const [newNetwork, setNewNetwork] = useState<Network>({
    id: "",
    name: "",
    rpcUrl: "",
    blockExplorerUrl: "",
    chainId: 0,
    isTestnet: false,
    enabled: true
  });

  const fetchConfigurations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await Parse.Cloud.run('getChainConfigurations');
      
      if (result.success && result.configurations) {
        setConfigurations(result.configurations);
        if (result.configurations.length > 0 && !activeTab) {
          setActiveTab(result.configurations[0].chainId);
        }
      }
    } catch (error) {
      console.error('Error fetching chain configurations:', error);
      toast.error('Failed to load chain configurations');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  const handleNetworkToggle = async (configId: string, networkId: string, enabled: boolean) => {
    try {
      const result = await Parse.Cloud.run('updateChainNetwork', {
        configId,
        networkId,
        updates: { enabled }
      });
      
      if (result.success) {
        toast.success('Network status updated');
        fetchConfigurations();
      }
    } catch (error) {
      console.error('Error updating network:', error);
      toast.error('Failed to update network status');
    }
  };

  const handleAddNetwork = async () => {
    if (!selectedConfig || !newNetwork.name || !newNetwork.rpcUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const result = await Parse.Cloud.run('addChainNetwork', {
        configId: selectedConfig.id,
        network: newNetwork
      });
      
      if (result.success) {
        toast.success('Network added successfully');
        setShowAddNetwork(false);
        setNewNetwork({
          id: "",
          name: "",
          rpcUrl: "",
          blockExplorerUrl: "",
          chainId: 0,
          isTestnet: false,
          enabled: true
        });
        fetchConfigurations();
      }
    } catch (error) {
      console.error('Error adding network:', error);
      toast.error('Failed to add network');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveNetwork = async (configId: string, networkId: string) => {
    if (!confirm('Are you sure you want to remove this network?')) {
      return;
    }

    try {
      const result = await Parse.Cloud.run('removeChainNetwork', {
        configId,
        networkId
      });
      
      if (result.success) {
        toast.success('Network removed successfully');
        fetchConfigurations();
      }
    } catch (error) {
      console.error('Error removing network:', error);
      toast.error('Failed to remove network');
    }
  };

  const handleTestRpc = async (rpcUrl: string) => {
    setTestingRpc(rpcUrl);
    try {
      const result = await Parse.Cloud.run('testRpcConnection', {
        rpcUrl
      });
      
      if (result.success) {
        toast.success(`Connected! Latest block: ${result.blockNumber}`);
      } else {
        toast.error(result.message || 'Connection failed');
      }
    } catch (error) {
      console.error('Error testing RPC:', error);
      toast.error('Failed to test RPC connection');
    } finally {
      setTestingRpc(null);
    }
  };

  const handleToggleChainStatus = async (configId: string, isActive: boolean) => {
    try {
      const result = await Parse.Cloud.run('toggleChainStatus', {
        configId,
        isActive
      });
      
      if (result.success) {
        toast.success(result.message);
        fetchConfigurations();
      }
    } catch (error) {
      console.error('Error toggling chain status:', error);
      toast.error('Failed to update chain status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeConfig = configurations.find(c => c.chainId === activeTab);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chain Configuration</CardTitle>
          <CardDescription>
            Configure blockchain networks and RPC endpoints for the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configurations.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No chain configurations found. Please add configurations through the backend.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-[400px]">
                {configurations.map(config => (
                  <TabsTrigger key={config.chainId} value={config.chainId}>
                    <div className="flex items-center gap-2">
                      {config.displayName}
                      {!config.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {configurations.map(config => (
                <TabsContent key={config.chainId} value={config.chainId}>
                  <div className="space-y-4">
                    {/* Chain Info */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <h3 className="font-medium">{config.displayName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Chain ID: {config.chainId} | Native: {config.nativeCurrency.symbol}
                        </p>
                      </div>
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) => handleToggleChainStatus(config.id, checked)}
                      />
                    </div>

                    {/* Networks Table */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium">Network Endpoints</h4>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedConfig(config);
                            setShowAddNetwork(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Network
                        </Button>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Network</TableHead>
                            <TableHead>RPC URL</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config.networks.map((network) => (
                            <TableRow key={network.id}>
                              <TableCell className="font-medium">{network.name}</TableCell>
                              <TableCell className="font-mono text-xs max-w-[300px] truncate">
                                {network.rpcUrl}
                              </TableCell>
                              <TableCell>
                                <Badge variant={network.isTestnet ? "secondary" : "default"}>
                                  {network.isTestnet ? "Testnet" : "Mainnet"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={network.enabled}
                                  onCheckedChange={(checked) => 
                                    handleNetworkToggle(config.id, network.id, checked)
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleTestRpc(network.rpcUrl)}
                                    disabled={testingRpc === network.rpcUrl}
                                  >
                                    {testingRpc === network.rpcUrl ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Test"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveNetwork(config.id, network.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Add Network Dialog */}
      <Dialog open={showAddNetwork} onOpenChange={setShowAddNetwork}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Network Endpoint</DialogTitle>
            <DialogDescription>
              Add a new RPC endpoint for {selectedConfig?.displayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="network-name">Network Name</Label>
              <Input
                id="network-name"
                value={newNetwork.name}
                onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })}
                placeholder="e.g., Mainnet, Sepolia"
              />
            </div>
            
            <div>
              <Label htmlFor="rpc-url">RPC URL</Label>
              <Input
                id="rpc-url"
                value={newNetwork.rpcUrl}
                onChange={(e) => setNewNetwork({ ...newNetwork, rpcUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div>
              <Label htmlFor="explorer-url">Block Explorer URL (Optional)</Label>
              <Input
                id="explorer-url"
                value={newNetwork.blockExplorerUrl}
                onChange={(e) => setNewNetwork({ ...newNetwork, blockExplorerUrl: e.target.value })}
                placeholder="https://etherscan.io"
              />
            </div>
            
            <div>
              <Label htmlFor="chain-id">Chain ID (Optional)</Label>
              <Input
                id="chain-id"
                type="number"
                value={newNetwork.chainId || ""}
                onChange={(e) => setNewNetwork({ ...newNetwork, chainId: parseInt(e.target.value) || 0 })}
                placeholder="1"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is-testnet"
                checked={newNetwork.isTestnet}
                onCheckedChange={(checked) => setNewNetwork({ ...newNetwork, isTestnet: checked })}
              />
              <Label htmlFor="is-testnet">This is a testnet</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNetwork(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNetwork} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Network"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
