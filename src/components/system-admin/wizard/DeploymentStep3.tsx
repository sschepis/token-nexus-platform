
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Info, CheckCircle, AlertTriangle, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DeploymentStep3Props {
  formData: {
    chain: string;
    network: string;
    factoryContract: string;
    appBundle: string;
    [key: string]: any;
  };
  isLoading: boolean;
  onDeploy: () => Promise<void>;
}

export const DeploymentStep3: React.FC<DeploymentStep3Props> = ({ formData, isLoading, onDeploy }) => {
  const getChainName = (chainId: string): string => {
    const chains: Record<string, string> = {
      "ethereum": "Ethereum",
      "polygon": "Polygon",
      "bsc": "Binance Smart Chain",
      "avalanche": "Avalanche",
      "optimism": "Optimism"
    };
    return chains[chainId] || chainId;
  };

  const getNetworkName = (chainId: string, networkId: string): string => {
    if (networkId === "mainnet") return "Mainnet";
    
    const networkNames: Record<string, Record<string, string>> = {
      "ethereum": {
        "sepolia": "Sepolia Testnet",
        "goerli": "Goerli Testnet"
      },
      "polygon": {
        "mumbai": "Mumbai Testnet"
      },
      "bsc": {
        "testnet": "Testnet"
      },
      "avalanche": {
        "fuji": "Fuji Testnet"
      },
      "optimism": {
        "goerli": "Goerli Testnet"
      }
    };
    
    return networkNames[chainId]?.[networkId] || networkId;
  };

  const getFactoryName = (factoryId: string): string => {
    const factories: Record<string, string> = {
      "basic": "Basic Factory",
      "advanced": "Advanced Factory (ERC-1167 Clone)",
      "premium": "Premium Factory (Diamond Standard)"
    };
    return factories[factoryId] || factoryId;
  };

  const getBundleName = (bundleId: string): string => {
    const bundles: Record<string, string> = {
      "standard": "Standard App Bundle (v1.2.0)",
      "professional": "Professional App Bundle (v1.1.5)",
      "enterprise": "Enterprise App Bundle (v1.0.8)"
    };
    return bundles[bundleId] || bundleId;
  };

  const getAuthMethod = (): string => {
    if (formData.authMethod === "privateKey") return "Private Key";
    return "Web3 Wallet";
  };

  return (
    <div className="space-y-6">
      <Alert variant="default" className="bg-amber-50 text-amber-800 border-amber-200">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please review your deployment configuration before continuing. This action will deploy smart contracts to the selected blockchain.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Deployment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Blockchain</span>
              <span className="font-medium">{getChainName(formData.chain)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">
                {getNetworkName(formData.chain, formData.network)}
                <Badge variant={formData.network === "mainnet" ? "destructive" : "secondary"} className="ml-2">
                  {formData.network === "mainnet" ? "Production" : "Test"}
                </Badge>
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Factory Contract</span>
              <span className="font-medium">{getFactoryName(formData.factoryContract)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">App Bundle</span>
              <span className="font-medium">{getBundleName(formData.appBundle)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authentication Method</span>
              <span className="font-medium">{getAuthMethod()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto-verify Contract</span>
              <span className="font-medium">{formData.deploymentOptions?.autoVerify ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proxy Pattern Enabled</span>
              <span className="font-medium">{formData.deploymentOptions?.enableProxy ? "Yes" : "No"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center space-x-2">
            <Loader className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">Deploying contract...</span>
          </div>
          <Progress value={45} className="h-2" />
        </div>
      )}
    </div>
  );
};
