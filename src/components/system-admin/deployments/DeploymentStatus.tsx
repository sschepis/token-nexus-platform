
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink, RotateCw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type DeploymentStatus = 'pending' | 'processing' | 'successful' | 'failed';

interface Deployment {
  id: string;
  chain: string;
  network: string;
  contract: string;
  txHash: string;
  status: DeploymentStatus;
  timestamp: string;
  progress: number;
  errorMessage?: string;
}

export const DeploymentStatus = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([
    {
      id: "dep-1",
      chain: "ethereum",
      network: "sepolia",
      contract: "BasicFactory",
      txHash: "0x1234...5678",
      status: "successful",
      timestamp: "2023-05-20 14:32",
      progress: 100
    },
    {
      id: "dep-2",
      chain: "polygon",
      network: "mainnet",
      contract: "AdvancedFactory",
      txHash: "0xabcd...efgh",
      status: "processing",
      timestamp: "2023-05-20 15:45",
      progress: 65
    },
    {
      id: "dep-3",
      chain: "bsc",
      network: "testnet",
      contract: "BasicFactory",
      txHash: "0x9876...5432",
      status: "failed",
      timestamp: "2023-05-19 10:15",
      progress: 30,
      errorMessage: "Transaction reverted: out of gas"
    }
  ]);
  
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  const handleRetry = (deploymentId: string) => {
    setDeployments(deployments.map(deployment => {
      if (deployment.id === deploymentId) {
        toast.success(`Retrying deployment ${deploymentId}`);
        return { ...deployment, status: 'processing' as DeploymentStatus, progress: 10 };
      }
      return deployment;
    }));
  };
  
  const handleViewDetails = (deployment: Deployment) => {
    setSelectedDeployment(deployment);
    setShowDetailsDialog(true);
  };
  
  const getChainExplorerUrl = (chain: string, txHash: string): string => {
    const explorers: Record<string, string> = {
      ethereum: "https://sepolia.etherscan.io/tx/",
      polygon: "https://polygonscan.com/tx/",
      bsc: "https://testnet.bscscan.com/tx/"
    };
    
    return `${explorers[chain] || "#"}${txHash}`;
  };
  
  const getStatusBadgeVariant = (status: DeploymentStatus) => {
    switch (status) {
      case "successful":
        return "success";
      case "processing":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Chain</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Contract</TableHead>
            <TableHead>Transaction</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deployments.map(deployment => (
            <TableRow key={deployment.id}>
              <TableCell className="font-medium">{deployment.chain}</TableCell>
              <TableCell>{deployment.network}</TableCell>
              <TableCell>{deployment.contract}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono">{deployment.txHash}</span>
                  <a 
                    href={getChainExplorerUrl(deployment.chain, deployment.txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                  </a>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant={getStatusBadgeVariant(deployment.status)}>
                    {deployment.status}
                  </Badge>
                  {deployment.status === "processing" && (
                    <Progress value={deployment.progress} className="h-1" />
                  )}
                </div>
              </TableCell>
              <TableCell>{deployment.timestamp}</TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleViewDetails(deployment)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {deployment.status === "failed" && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRetry(deployment.id)}
                      title="Retry Deployment"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deployment Details</DialogTitle>
          </DialogHeader>
          
          {selectedDeployment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Deployment ID</p>
                  <p className="font-medium">{selectedDeployment.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadgeVariant(selectedDeployment.status)}>
                    {selectedDeployment.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blockchain</p>
                  <p className="font-medium">{selectedDeployment.chain}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Network</p>
                  <p className="font-medium">{selectedDeployment.network}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contract</p>
                  <p className="font-medium">{selectedDeployment.contract}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{selectedDeployment.timestamp}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Transaction Hash</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-mono">{selectedDeployment.txHash}</p>
                    <a 
                      href={getChainExplorerUrl(selectedDeployment.chain, selectedDeployment.txHash)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
              
              {selectedDeployment.status === "processing" && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Deployment Progress</span>
                    <span>{selectedDeployment.progress}%</span>
                  </div>
                  <Progress value={selectedDeployment.progress} className="h-2" />
                </div>
              )}
              
              {selectedDeployment.status === "failed" && selectedDeployment.errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{selectedDeployment.errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedDeployment?.status === "failed" && (
              <Button onClick={() => handleRetry(selectedDeployment.id)}>
                <RotateCw className="mr-2 h-4 w-4" />
                Retry Deployment
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
