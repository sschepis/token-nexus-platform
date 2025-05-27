import React, { useState, useEffect } from 'react';
import evmNetworks from '@/config/evmNetworks.json'; // Assuming direct import is feasible
import { loadDeployedContracts } from '@/lib/evmUtils'; // Import the utility function
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Import Table components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton for loading state
import { Button } from "@/components/ui/button"; // Import Button for block explorer link
import { ExternalLinkIcon, CopyIcon } from "@radix-ui/react-icons"; // Import icons
import { useToast } from "@/components/ui/use-toast"; // Import toast hook

// Define a type for deployed contracts based on the plan
export interface DeployedContract { // Exporting the interface
  contractName: string;
  address: string;
  blockExplorerUrl: string; // This will be constructed
  // Add other relevant fields from JSON if needed later, e.g., abi: any;
}

export const EVMContractsManager = () => {
  const { toast } = useToast(); // Initialize toast hook
  const [networks, setNetworks] = useState<typeof evmNetworks>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContract[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading networks

  useEffect(() => {
    // Load networks from the imported JSON
    if (evmNetworks && evmNetworks.length > 0) {
      setNetworks(evmNetworks);
      // Set the first network as selected by default
      setSelectedNetworkId(evmNetworks[0].id);
    }
    setIsLoading(false); // Networks loaded
  }, []); // Empty dependency array means this effect runs once on mount

  // Effect to load contracts when selectedNetworkId changes
  useEffect(() => {
    if (selectedNetworkId) {
      const selectedNetwork = networks.find(network => network.id === selectedNetworkId);
      if (selectedNetwork) {
        setIsLoading(true); // Start loading contracts
        loadDeployedContracts(selectedNetwork) // Pass the network object
          .then(contracts => {
            setDeployedContracts(contracts);
          })
          .catch(error => {
            console.error("Error loading deployed contracts:", error);
            setDeployedContracts([]); // Clear contracts on error
          })
          .finally(() => {
            setIsLoading(false); // Finish loading
          });
      } else {
        // Handle case where selected network ID doesn't match any network (shouldn't happen if networks are loaded correctly)
        console.warn(`Selected network with ID ${selectedNetworkId} not found.`);
        setDeployedContracts([]);
        setIsLoading(false);
      }
    } else {
      setDeployedContracts([]); // Clear contracts if no network is selected
    }
  }, [selectedNetworkId, networks]); // Rerun effect when selectedNetworkId or networks change

  if (isLoading) {
    return <div>Loading networks...</div>;
  }

  if (networks.length === 0) {
    return <div>No EVM networks configured. Please add networks to src/config/evmNetworks.json</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">EVM Contracts Management</h2>

      {/* Network Selector Placeholder */}
      <div>
        <label htmlFor="network-select" className="block text-sm font-medium text-gray-700">
          Select Network
        </label>
        {/* Network Selector */}
        <Select onValueChange={setSelectedNetworkId} value={selectedNetworkId || ''}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a network" />
          </SelectTrigger>
          <SelectContent>
            {networks.map(network => (
              <SelectItem key={network.id} value={network.id}>{network.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deployed Contracts Display */}
      <Card>
        <CardHeader>
          <CardTitle>Deployed Contracts for {networks.find(n => n.id === selectedNetworkId)?.name || 'Selected Network'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[300px]" />
            </div>
          ) : deployedContracts.length === 0 ? (
            <p>No contracts found for this network.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Block Explorer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployedContracts.map((contract, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{contract.contractName}</TableCell>
                    <TableCell>
                      {contract.address}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          navigator.clipboard.writeText(contract.address);
                          toast({
                            title: "Copied!",
                            description: "Contract address copied to clipboard.",
                          });
                        }}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      {contract.blockExplorerUrl && (
                        <a href={contract.blockExplorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                          View on Explorer <ExternalLinkIcon className="ml-1 h-4 w-4" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};