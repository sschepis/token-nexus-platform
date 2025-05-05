
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface DeploymentStep1Props {
  formData: {
    chain: string;
    network: string;
    [key: string]: any;
  };
  updateFormData: (data: Partial<{ chain: string; network: string; }>) => void;
}

export const DeploymentStep1: React.FC<DeploymentStep1Props> = ({ formData, updateFormData }) => {
  const supportedChains = [
    { id: "ethereum", name: "Ethereum" },
    { id: "polygon", name: "Polygon" },
    { id: "bsc", name: "Binance Smart Chain" },
    { id: "avalanche", name: "Avalanche" },
    { id: "optimism", name: "Optimism" }
  ];

  const networks: Record<string, Array<{ id: string; name: string; }>> = {
    ethereum: [
      { id: "mainnet", name: "Mainnet" },
      { id: "sepolia", name: "Sepolia Testnet" },
      { id: "goerli", name: "Goerli Testnet" }
    ],
    polygon: [
      { id: "mainnet", name: "Mainnet" },
      { id: "mumbai", name: "Mumbai Testnet" }
    ],
    bsc: [
      { id: "mainnet", name: "Mainnet" },
      { id: "testnet", name: "Testnet" }
    ],
    avalanche: [
      { id: "mainnet", name: "Mainnet" },
      { id: "fuji", name: "Fuji Testnet" }
    ],
    optimism: [
      { id: "mainnet", name: "Mainnet" },
      { id: "goerli", name: "Goerli Testnet" }
    ]
  };

  const handleChainChange = (chainId: string) => {
    updateFormData({ chain: chainId, network: "" });
  };

  const handleNetworkChange = (networkId: string) => {
    updateFormData({ network: networkId });
  };

  const availableNetworks = formData.chain ? networks[formData.chain] : [];

  return (
    <div className="space-y-6">
      <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Select the blockchain and network where you want to deploy your factory contract.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="chain-select">Blockchain</Label>
          <Select value={formData.chain} onValueChange={handleChainChange}>
            <SelectTrigger id="chain-select">
              <SelectValue placeholder="Select a blockchain" />
            </SelectTrigger>
            <SelectContent>
              {supportedChains.map(chain => (
                <SelectItem key={chain.id} value={chain.id}>
                  {chain.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="network-select">Network</Label>
          <Select 
            value={formData.network} 
            onValueChange={handleNetworkChange}
            disabled={!formData.chain}
          >
            <SelectTrigger id="network-select">
              <SelectValue placeholder={formData.chain ? "Select a network" : "Select a blockchain first"} />
            </SelectTrigger>
            <SelectContent>
              {availableNetworks.map(network => (
                <SelectItem key={network.id} value={network.id}>
                  {network.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
