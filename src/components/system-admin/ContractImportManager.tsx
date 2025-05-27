import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface DeploymentInfo {
  networkName: string;
  chainId: string;
  contractCount: number;
  contracts: Array<{
    contractName: string;
    address: string;
  }>;
}

interface ImportedContract {
  contractName: string;
  address: string;
}

interface ImportStatus {
  isImported: boolean;
  importedAt?: string;
  importedContracts?: number;
  lastError?: string;
  contracts?: ImportedContract[]; // Add contracts array to ImportStatus
}

export const ContractImportManager: React.FC = () => {
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, dismiss } = useToast(); // Initialize toast, include dismiss

  // Fetch deployment info and import status
  const fetchDeploymentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/system-admin/deployment-status');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deployment status');
      }
      
      setDeploymentInfo(data.deployment);
      setImportStatus(data.importStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deployment status');
    } finally {
      setLoading(false);
    }
  };

  // Import deployment artifacts
  const handleImportDeployment = async () => {
    if (!deploymentInfo?.networkName) {
      toast({
        title: "Import Error",
        description: "No network selected for import.",
        variant: "destructive",
      });
      return;
    }

    const importToastId = toast({
      title: "Importing Contracts",
      description: `Starting import for network: ${deploymentInfo.networkName}...`,
      variant: "default",
      duration: 1000000, // Long duration for ongoing process
    });

    try {
      setImporting(true);
      setError(null);
      
      const response = await fetch('/api/system-admin/import-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          networkName: deploymentInfo?.networkName
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import deployment');
      }
      
      dismiss(importToastId.id); // Dismiss initial toast
      toast({
        title: "Import Successful",
        description: data.message || `Successfully imported contracts for network: ${deploymentInfo.networkName}`,
        variant: "default", // Changed from "success" to "default"
      });

      // Refresh status after successful import
      await fetchDeploymentStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import deployment';
      setError(errorMessage);
      dismiss(importToastId.id); // Dismiss initial toast
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchDeploymentStatus();
  }, []);

  const getStatusBadge = () => {
    if (!importStatus) return null;
    
    if (importStatus.isImported) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Imported
        </Badge>
      );
    } else if (importStatus.lastError) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <AlertCircle className="w-3 h-3 mr-1" />
          Not Imported
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading deployment status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contract Import</h1>
        <p className="text-muted-foreground">
          Import smart contract deployment artifacts into the platform database
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!deploymentInfo ? (
        <Card>
          <CardHeader>
            <CardTitle>No Deployment Found</CardTitle>
            <CardDescription>
              No deployment artifacts found in src/config/evm-deployments/
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please ensure deployment artifacts are present in the evm-deployments directory.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Deployment: {deploymentInfo.networkName}</span>
              {getStatusBadge()}
            </CardTitle>
            <CardDescription>
              Chain ID: {deploymentInfo.chainId} • {deploymentInfo.contractCount} contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Import Status Section */}
            <div className="flex items-center space-x-3">
              {importStatus?.isImported ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : importStatus?.lastError ? (
                <XCircle className="w-8 h-8 text-red-500" />
              ) : (
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              )}
              <div>
                <p className="text-lg font-semibold">
                  {importStatus?.isImported
                    ? `Imported: ${importStatus.importedContracts} contracts`
                    : importStatus?.lastError
                    ? 'Import Failed'
                    : 'Not Yet Imported'}
                </p>
                {importStatus?.isImported && importStatus.importedAt && (
                  <p className="text-sm text-muted-foreground">
                    Last imported on: {new Date(importStatus.importedAt).toLocaleString()}
                  </p>
                )}
                {importStatus?.lastError && (
                  <p className="text-sm text-red-500">Error: {importStatus.lastError}</p>
                )}
              </div>
            </div>

            {/* Blockchain Information Section */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Blockchain Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <span className="font-medium">Network Name:</span>
                  <span>{deploymentInfo.networkName}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <span className="font-medium">Chain ID:</span>
                  <span>{deploymentInfo.chainId}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <span className="font-medium">Contracts Found:</span>
                  <span>{deploymentInfo.contractCount}</span>
                </div>
                {/* Placeholder for RPC endpoint */}
                <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                  <span className="font-medium">RPC Endpoint:</span>
                  <span className="text-muted-foreground">Not configured</span>
                </div>
              </div>
            </div>

            {/* Available Contracts Section */}
            <div>
              <h3 className="font-semibold text-lg mb-2">Available Contracts ({deploymentInfo.contractCount})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {deploymentInfo.contracts.map((contract, index) => {
                  const isImported = importStatus?.contracts?.some(
                    (imported) => imported.contractName === contract.contractName && imported.address === contract.address
                  );
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded border ${
                        isImported ? 'bg-green-800/20 border-green-700' : 'bg-zinc-800/20 border-zinc-700'
                      }`}
                    >
                      <span className="font-mono text-sm">
                        {contract.contractName}
                        {isImported && <CheckCircle className="inline-block w-4 h-4 ml-2 text-green-500" />}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleImportDeployment}
                disabled={importing}
                className="flex items-center space-x-2"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{importing ? 'Importing...' : 'Import Deployment'}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={fetchDeploymentStatus}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};