import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileCode, 
  Factory, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertCircle,
  Copy
} from "lucide-react";
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

interface ImportResult {
  networkId: string;
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
}

interface ImportConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  networks: NetworkInfo[];
  onImportComplete: () => void;
}

export const ImportConfirmDialog: React.FC<ImportConfirmDialogProps> = ({
  isOpen,
  onClose,
  networks,
  onImportComplete,
}) => {
  const [selectedContracts, setSelectedContracts] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [currentNetwork, setCurrentNetwork] = useState<string>("");
  const [showResults, setShowResults] = useState(false);

  // Initialize all contracts as selected when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      const allContractIds = new Set<string>();
      networks.forEach(network => {
        network.contracts.forEach(contract => {
          allContractIds.add(`${network.id}:${contract.address}`);
        });
      });
      setSelectedContracts(allContractIds);
      setShowResults(false);
      setImportResults([]);
      setImportProgress(0);
    }
  }, [isOpen, networks]);

  const toggleContractSelection = (contractId: string) => {
    const newSelection = new Set(selectedContracts);
    if (newSelection.has(contractId)) {
      newSelection.delete(contractId);
    } else {
      newSelection.add(contractId);
    }
    setSelectedContracts(newSelection);
  };

  const toggleNetworkSelection = (networkId: string) => {
    const newSelection = new Set(selectedContracts);
    const network = networks.find(n => n.id === networkId);
    if (!network) return;

    const networkContracts = network.contracts.map(c => `${networkId}:${c.address}`);
    const allSelected = networkContracts.every(id => selectedContracts.has(id));

    if (allSelected) {
      networkContracts.forEach(id => newSelection.delete(id));
    } else {
      networkContracts.forEach(id => newSelection.add(id));
    }
    setSelectedContracts(newSelection);
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

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    const results: ImportResult[] = [];

    try {
      const totalNetworks = networks.length;
      
      for (let i = 0; i < networks.length; i++) {
        const network = networks[i];
        setCurrentNetwork(network.displayName);
        
        // Filter selected contracts for this network
        const contractsToImport = network.contracts.filter(
          contract => selectedContracts.has(`${network.id}:${contract.address}`)
        );

        if (contractsToImport.length > 0) {
          try {
            const result = await Parse.Cloud.run("importFactoryContracts", {
              networkId: network.id,
              contracts: contractsToImport,
            });

            results.push({
              networkId: network.id,
              success: true,
              imported: result.imported || contractsToImport.length,
              failed: result.failed || 0,
              errors: result.errors,
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Import failed";
            results.push({
              networkId: network.id,
              success: false,
              imported: 0,
              failed: contractsToImport.length,
              errors: [errorMessage],
            });
          }
        }

        setImportProgress(((i + 1) / totalNetworks) * 100);
      }

      setImportResults(results);
      setShowResults(true);

      // Show success/failure toast
      const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
      const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

      if (totalFailed === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${totalImported} contracts`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${totalImported} contracts, ${totalFailed} failed`,
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setCurrentNetwork("");
    }
  };

  const handleClose = () => {
    if (showResults) {
      onImportComplete();
    }
    onClose();
  };

  const selectedCount = selectedContracts.size;
  const totalContracts = networks.reduce((sum, n) => sum + n.contracts.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {showResults ? "Import Results" : "Confirm Contract Import"}
          </DialogTitle>
          <DialogDescription>
            {showResults
              ? "Review the results of your contract import"
              : `Review and confirm the contracts to import (${selectedCount} of ${totalContracts} selected)`}
          </DialogDescription>
        </DialogHeader>

        {isImporting ? (
          <div className="py-8">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Importing contracts from {currentNetwork}...
              </p>
              <Progress value={importProgress} className="w-full" />
            </div>
          </div>
        ) : showResults ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {importResults.map((result) => {
                const network = networks.find(n => n.id === result.networkId);
                return (
                  <Alert
                    key={result.networkId}
                    variant={result.success ? "default" : "destructive"}
                  >
                    <div className="flex items-start space-x-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <AlertDescription>
                          <strong>{network?.displayName || result.networkId}</strong>
                          <br />
                          {result.imported > 0 && (
                            <span className="text-sm">
                              ✓ {result.imported} contracts imported
                            </span>
                          )}
                          {result.failed > 0 && (
                            <span className="text-sm text-destructive">
                              <br />✗ {result.failed} contracts failed
                            </span>
                          )}
                          {result.errors && result.errors.length > 0 && (
                            <div className="mt-2 text-sm">
                              {result.errors.map((error, i) => (
                                <div key={i} className="text-destructive">
                                  • {error}
                                </div>
                              ))}
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {networks.map((network) => {
                const networkContracts = network.contracts.map(c => `${network.id}:${c.address}`);
                const selectedInNetwork = networkContracts.filter(id => selectedContracts.has(id)).length;
                const allSelected = selectedInNetwork === network.contracts.length;

                return (
                  <div key={network.id} className="space-y-2">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        checked={selectedInNetwork > 0}
                        onCheckedChange={() => toggleNetworkSelection(network.id)}
                      />
                      <span className="font-medium">{network.displayName}</span>
                      <Badge variant="secondary">{network.id}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ({selectedInNetwork}/{network.contracts.length} selected)
                      </span>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Contract Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {network.contracts.map((contract) => {
                          const contractId = `${network.id}:${contract.address}`;
                          return (
                            <TableRow key={contractId}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedContracts.has(contractId)}
                                  onCheckedChange={() => toggleContractSelection(contractId)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                  {contract.isFactory ? (
                                    <Factory className="h-4 w-4 text-primary" />
                                  ) : (
                                    <FileCode className="h-4 w-4" />
                                  )}
                                  <span>{contract.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <code className="text-xs">{formatAddress(contract.address)}</code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyAddress(contract.address)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                {contract.isFactory ? (
                                  <Badge>Factory</Badge>
                                ) : (
                                  <Badge variant="outline">Contract</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          {showResults ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${selectedCount} Contract${selectedCount !== 1 ? 's' : ''}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};