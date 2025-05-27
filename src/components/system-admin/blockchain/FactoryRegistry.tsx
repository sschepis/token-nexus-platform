import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Factory, 
  ExternalLink, 
  Copy, 
  Trash2, 
  RefreshCw,
  Search,
  Download,
  Filter
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Parse from "parse";

interface FactoryContract {
  id: string;
  networkId: string;
  contractName: string;
  address: string;
  contractType: string;
  importedAt: Date;
  importedBy: string;
}

interface Network {
  id: string;
  displayName: string;
  explorerUrl?: string;
}

export const FactoryRegistry: React.FC = () => {
  const [factories, setFactories] = useState<FactoryContract[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  const loadFactories = async () => {
    setIsLoading(true);
    try {
      const networkId = selectedNetwork === "all" ? undefined : selectedNetwork;
      const result = await Parse.Cloud.run("getSystemFactoryContracts", { 
        networkId,
        searchTerm: searchTerm || undefined
      });
      
      setFactories(result.factories || []);
      if (result.networks) {
        setNetworks(result.networks);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load factories";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFactories();
  }, [selectedNetwork]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFactories();
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address Copied",
      description: "Contract address copied to clipboard",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getExplorerUrl = (networkId: string, address: string) => {
    const network = networks.find(n => n.id === networkId);
    if (!network?.explorerUrl) return null;
    return `${network.explorerUrl}/address/${address}`;
  };

  const handleDelete = async (factoryId: string) => {
    try {
      await Parse.Cloud.run("deleteFactoryContract", { factoryId });
      toast({
        title: "Contract Deleted",
        description: "Factory contract removed from registry",
      });
      loadFactories();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete contract";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setContractToDelete(null);
    }
  };

  const exportRegistry = async () => {
    try {
      const data = await Parse.Cloud.run("exportFactoryRegistry");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factory-registry-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Factory registry exported to JSON file",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export registry";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getNetworkBadgeVariant = (networkId: string): "default" | "secondary" | "outline" => {
    const mainnetIds = ["mainnet", "polygon", "arbitrum", "optimism"];
    if (mainnetIds.includes(networkId)) return "default";
    return "secondary";
  };

  const filteredFactories = factories.filter(factory => {
    if (searchTerm && !factory.contractName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !factory.address.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Factory Contract Registry
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportRegistry}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadFactories}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          
          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  All Networks
                </div>
              </SelectItem>
              {networks.map((network) => (
                <SelectItem key={network.id} value={network.id}>
                  {network.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredFactories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || selectedNetwork !== "all" 
              ? "No factory contracts found matching your filters"
              : "No factory contracts imported yet"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract Name</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactories.map((factory) => {
                  const network = networks.find(n => n.id === factory.networkId);
                  const explorerUrl = getExplorerUrl(factory.networkId, factory.address);
                  
                  return (
                    <TableRow key={factory.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Factory className="h-4 w-4 text-primary" />
                          {factory.contractName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getNetworkBadgeVariant(factory.networkId)}>
                          {network?.displayName || factory.networkId}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{formatAddress(factory.address)}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyAddress(factory.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {explorerUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              asChild
                            >
                              <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{factory.contractType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(factory.importedAt).toLocaleDateString()}</div>
                          <div className="text-muted-foreground text-xs">
                            by {factory.importedBy}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setContractToDelete(factory.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Factory Contract</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {factory.contractName} from the registry?
                                This will not affect any contracts deployed by organizations using this factory.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(factory.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Total: {filteredFactories.length} factory contract{filteredFactories.length !== 1 ? 's' : ''}
          {selectedNetwork !== "all" && ` on ${networks.find(n => n.id === selectedNetwork)?.displayName}`}
        </div>
      </CardContent>
    </Card>
  );
};