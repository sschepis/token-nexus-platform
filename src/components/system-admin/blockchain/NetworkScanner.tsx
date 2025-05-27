import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FolderOpen, FileCode, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Parse from "parse";

interface NetworkInfo {
  id: string;
  displayName: string;
  contractCount: number;
  factoryCount: number;
  contracts: ContractInfo[];
}

interface ContractInfo {
  name: string;
  address: string;
  isFactory: boolean;
  abi?: Record<string, unknown>[];
}

interface NetworkScannerProps {
  onImportClick: (selectedNetworks: NetworkInfo[]) => void;
}

export const NetworkScanner: React.FC<NetworkScannerProps> = ({ onImportClick }) => {
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanNetworks = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const result = await Parse.Cloud.run("scanAvailableNetworks");
      setNetworks(result.networks || []);
      
      if (result.networks.length === 0) {
        setError("No networks found in deployment directory");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to scan networks";
      console.error("Error scanning networks:", err);
      setError(errorMessage);
      toast({
        title: "Scan Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    scanNetworks();
  }, []);

  const toggleNetworkSelection = (networkId: string) => {
    const newSelection = new Set(selectedNetworks);
    if (newSelection.has(networkId)) {
      newSelection.delete(networkId);
    } else {
      newSelection.add(networkId);
    }
    setSelectedNetworks(newSelection);
  };

  const handleImport = () => {
    const networksToImport = networks.filter(n => selectedNetworks.has(n.id));
    if (networksToImport.length === 0) {
      toast({
        title: "No Networks Selected",
        description: "Please select at least one network to import",
        variant: "destructive",
      });
      return;
    }
    onImportClick(networksToImport);
  };

  const getNetworkDisplayName = (networkId: string): string => {
    const nameMap: Record<string, string> = {
      basesep: "Base Sepolia",
      mainnet: "Ethereum Mainnet",
      polygon: "Polygon",
      mumbai: "Polygon Mumbai",
      arbitrum: "Arbitrum One",
      optimism: "Optimism",
      // Add more network mappings as needed
    };
    return nameMap[networkId] || networkId;
  };

  const totalContracts = networks
    .filter(n => selectedNetworks.has(n.id))
    .reduce((sum, n) => sum + n.contractCount, 0);

  const totalFactories = networks
    .filter(n => selectedNetworks.has(n.id))
    .reduce((sum, n) => sum + n.factoryCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Contract Import Manager
          </span>
          <Button
            onClick={handleImport}
            disabled={selectedNetworks.size === 0 || isScanning}
          >
            Import Selected
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isScanning ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Scanning deployment directories...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : networks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No deployment networks found
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Detected Networks:
              </div>
              
              {networks.map((network) => (
                <div
                  key={network.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={network.id}
                      checked={selectedNetworks.has(network.id)}
                      onCheckedChange={() => toggleNetworkSelection(network.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={network.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {getNetworkDisplayName(network.id)}
                        <Badge variant="secondary" className="ml-2">
                          {network.id}
                        </Badge>
                      </label>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileCode className="h-3 w-3" />
                          {network.contractCount} contracts found
                        </span>
                        {network.factoryCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {network.factoryCount} factories
                            </Badge>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedNetworks.size > 0 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium">
                  Selected: {selectedNetworks.size} network{selectedNetworks.size !== 1 ? 's' : ''}, 
                  {' '}{totalContracts} contracts
                  {totalFactories > 0 && ` (${totalFactories} factories)`}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            onClick={scanNetworks}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              "Rescan"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};