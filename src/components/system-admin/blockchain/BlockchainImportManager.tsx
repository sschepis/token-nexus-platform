import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NetworkScanner } from "./NetworkScanner";
import { ImportConfirmDialog } from "./ImportConfirmDialog";
import { FactoryRegistry } from "./FactoryRegistry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Upload, 
  Factory, 
  AlertCircle,
  CheckCircle2,
  Network
} from "lucide-react";

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

export const BlockchainImportManager: React.FC = () => {
  const [selectedNetworks, setSelectedNetworks] = useState<NetworkInfo[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [refreshRegistry, setRefreshRegistry] = useState(0);

  const handleImportClick = (networks: NetworkInfo[]) => {
    setSelectedNetworks(networks);
    setShowImportDialog(true);
  };

  const handleImportComplete = () => {
    // Trigger a refresh of the factory registry
    setRefreshRegistry(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Overview Alert */}
      <Alert>
        <Network className="h-4 w-4" />
        <AlertTitle>Blockchain Contract Management</AlertTitle>
        <AlertDescription>
          Import and manage smart contracts from deployment artifacts. Factory contracts imported here 
          will be available for organizations to deploy their own instances.
        </AlertDescription>
      </Alert>

      {/* Main Tabs */}
      <Tabs defaultValue="import" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Contracts
          </TabsTrigger>
          <TabsTrigger value="registry" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Factory Registry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <NetworkScanner onImportClick={handleImportClick} />
          
          {/* Import Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>
                  Place deployment artifacts in <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  src/config/evm-deployments/[network-name]/</code>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>
                  Each JSON file should contain contract address and ABI
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <span>
                  Factory contracts (DiamondFactory, IdentityFactory, etc.) will be automatically identified
                </span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500" />
                <span>
                  Only system administrators can import contracts
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registry" className="space-y-4">
          <FactoryRegistry key={refreshRegistry} />
          
          {/* Registry Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About the Registry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                The Factory Registry stores all imported factory contracts that organizations can use 
                to deploy their own contract instances.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Factory contracts are shared across all organizations</li>
                <li>Each organization deploys their own instances using these factories</li>
                <li>Contract addresses are network-specific</li>
                <li>Deleting a factory from the registry doesn't affect deployed instances</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Confirmation Dialog */}
      <ImportConfirmDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        networks={selectedNetworks}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};