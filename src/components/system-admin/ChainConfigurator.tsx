
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const ChainConfigurator = () => {
  const [activeTab, setActiveTab] = useState("ethereum");
  
  const chainConfigs = {
    ethereum: {
      displayName: "Ethereum",
      networks: [
        { id: "mainnet", name: "Mainnet", rpcUrl: "https://mainnet.infura.io/v3/your-api-key", enabled: true },
        { id: "sepolia", name: "Sepolia Testnet", rpcUrl: "https://sepolia.infura.io/v3/your-api-key", enabled: true },
        { id: "goerli", name: "Goerli Testnet", rpcUrl: "https://goerli.infura.io/v3/your-api-key", enabled: false }
      ]
    },
    polygon: {
      displayName: "Polygon",
      networks: [
        { id: "mainnet", name: "Mainnet", rpcUrl: "https://polygon-rpc.com", enabled: true },
        { id: "mumbai", name: "Mumbai Testnet", rpcUrl: "https://rpc-mumbai.maticvigil.com", enabled: true }
      ]
    },
    bsc: {
      displayName: "Binance Smart Chain",
      networks: [
        { id: "mainnet", name: "Mainnet", rpcUrl: "https://bsc-dataseed.binance.org", enabled: true },
        { id: "testnet", name: "Testnet", rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545", enabled: true }
      ]
    }
  };
  
  const handleNetworkToggle = (networkId: string) => {
    toast.success(`${networkId} network status updated`);
  };
  
  const handleSaveChanges = () => {
    toast.success("Chain configuration saved successfully");
  };
  
  const handleAddNetwork = () => {
    toast.info("Network add functionality would be implemented here");
  };
  
  const handleDeleteNetwork = (networkId: string) => {
    toast.info(`Network ${networkId} would be deleted here`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Chain Configuration</CardTitle>
        <CardDescription>Configure blockchain networks for your application</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="bg-amber-50 text-amber-800 border-amber-200 mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Changes to blockchain configurations will affect all deployment operations. Use caution when modifying production networks.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            {Object.keys(chainConfigs).map(chainId => (
              <TabsTrigger key={chainId} value={chainId}>
                {chainConfigs[chainId as keyof typeof chainConfigs].displayName}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(chainConfigs).map(([chainId, config]) => (
            <TabsContent key={chainId} value={chainId} className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{config.displayName} Networks</h3>
                <Button size="sm" onClick={handleAddNetwork}>
                  <Plus className="h-4 w-4 mr-1" /> Add Network
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>RPC Endpoint</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.networks.map(network => (
                    <TableRow key={network.id}>
                      <TableCell>
                        {network.name}
                        {network.id === "mainnet" && (
                          <Badge variant="destructive" className="ml-2">Production</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={network.rpcUrl} 
                          onChange={(e) => {}}
                          className="max-w-md"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            checked={network.enabled}
                            onCheckedChange={() => handleNetworkToggle(network.id)} 
                          />
                          <Label>{network.enabled ? "Enabled" : "Disabled"}</Label>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteNetwork(network.id)}
                          disabled={network.id === "mainnet"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex justify-end mt-4">
                <Button onClick={handleSaveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
