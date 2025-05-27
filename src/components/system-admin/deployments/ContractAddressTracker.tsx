
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Search, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ContractAddress {
  id: string;
  name: string;
  contractType: string;
  address: string;
  chain: string;
  network: string;
  deployedAt: string;
  verified: boolean;
}

export const ContractAddressTracker = () => {
  const [filterChain, setFilterChain] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [contractAddresses, setContractAddresses] = useState<ContractAddress[]>([
    {
      id: "contract-1",
      name: "Main Factory",
      contractType: "FactoryV1",
      address: "0x1234567890abcdef1234567890abcdef12345678",
      chain: "ethereum",
      network: "sepolia",
      deployedAt: "2023-05-15",
      verified: true
    },
    {
      id: "contract-2",
      name: "Polygon Standard Factory",
      contractType: "FactoryV1",
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      chain: "polygon",
      network: "mainnet",
      deployedAt: "2023-05-18",
      verified: true
    },
    {
      id: "contract-3",
      name: "BSC Test Factory",
      contractType: "FactoryV2",
      address: "0x7890abcdef1234567890abcdef1234567890abcd",
      chain: "bsc",
      network: "testnet",
      deployedAt: "2023-05-20",
      verified: false
    }
  ]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Success",
      description: "Address copied to clipboard",
    });
  };
  
  const getChainExplorerUrl = (chain: string, network: string, address: string): string => {
    const explorers: Record<string, Record<string, string>> = {
      ethereum: {
        mainnet: "https://etherscan.io/address/",
        sepolia: "https://sepolia.etherscan.io/address/"
      },
      polygon: {
        mainnet: "https://polygonscan.com/address/",
        mumbai: "https://mumbai.polygonscan.com/address/"
      },
      bsc: {
        mainnet: "https://bscscan.com/address/",
        testnet: "https://testnet.bscscan.com/address/"
      }
    };
    
    return `${explorers[chain]?.[network] || "#"}${address}`;
  };
  
  const getDisplayAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  const filteredAddresses = contractAddresses.filter(contract => {
    let matchesChain = true;
    let matchesSearch = true;
    
    if (filterChain) {
      matchesChain = contract.chain === filterChain;
    }
    
    if (searchQuery) {
      matchesSearch = 
        contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.address.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    return matchesChain && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <Select value={filterChain} onValueChange={setFilterChain}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by chain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Chains</SelectItem>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="bsc">BSC</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contract Type</TableHead>
            <TableHead>Chain</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Deployed</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAddresses.map(contract => (
            <TableRow key={contract.id}>
              <TableCell className="font-medium">{contract.name}</TableCell>
              <TableCell>{contract.contractType}</TableCell>
              <TableCell>{contract.chain}</TableCell>
              <TableCell>{contract.network}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <span className="font-mono">{getDisplayAddress(contract.address)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(contract.address)}
                    title="Copy Address"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a 
                    href={getChainExplorerUrl(contract.chain, contract.network, contract.address)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="View on Block Explorer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                  </a>
                </div>
              </TableCell>
              <TableCell>{contract.deployedAt}</TableCell>
              <TableCell>
                {contract.verified ? (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline">Unverified</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
          
          {filteredAddresses.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                No contract addresses found matching your criteria
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
