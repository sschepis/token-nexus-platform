import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeploymentStep1 } from "./wizard/DeploymentStep1";
import { DeploymentStep2 } from "./wizard/DeploymentStep2";
import { DeploymentStep3 } from "./wizard/DeploymentStep3";
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Parse from "parse";

type WizardStep = "chain" | "config" | "deploy";

interface DeploymentFormData {
  chain: string;
  network: string;
  factoryContract: string;
  appBundle: string;
  deploymentOptions: Record<string, unknown>;
  privateKey?: string;
}

interface DeploymentStatus {
  id: string;
  status: 'pending' | 'deployed' | 'failed';
  contractAddress?: string;
  transactionHash?: string;
  gasUsed?: string;
  error?: string;
  deployedAt?: Date;
}

export const ContractDeployWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("chain");
  const [isLoading, setIsLoading] = useState(false);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [formData, setFormData] = useState<DeploymentFormData>({
    chain: "",
    network: "",
    factoryContract: "",
    appBundle: "",
    deploymentOptions: {}
  });

  const updateFormData = (data: Partial<DeploymentFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  // Poll deployment status
  useEffect(() => {
    if (!deploymentId || deploymentStatus?.status === 'deployed' || deploymentStatus?.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const result = await Parse.Cloud.run('getDeploymentStatus', {
          deploymentId
        });

        if (result.success && result.deployment) {
          setDeploymentStatus({
            id: result.deployment.id,
            status: result.deployment.status,
            contractAddress: result.deployment.contractAddress,
            transactionHash: result.deployment.transactionHash,
            gasUsed: result.deployment.gasUsed,
            error: result.deployment.error,
            deployedAt: result.deployment.deployedAt
          });

          if (result.deployment.status === 'deployed') {
            toast.success('Contract deployed successfully!');
          } else if (result.deployment.status === 'failed') {
            toast.error(`Deployment failed: ${result.deployment.error}`);
          }
        }
      } catch (error) {
        console.error('Error checking deployment status:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [deploymentId, deploymentStatus?.status]);

  const handleNext = () => {
    if (currentStep === "chain") {
      if (!formData.chain || !formData.network) {
        toast.error("Please select a blockchain and network");
        return;
      }
      setCurrentStep("config");
    } else if (currentStep === "config") {
      if (!formData.factoryContract || !formData.appBundle) {
        toast.error("Please complete all required fields");
        return;
      }
      setCurrentStep("deploy");
    }
  };

  const handleBack = () => {
    if (currentStep === "config") {
      setCurrentStep("chain");
    } else if (currentStep === "deploy") {
      setCurrentStep("config");
    }
  };

  const handleDeploy = async () => {
    if (!formData.privateKey) {
      toast.error("Please provide deployment credentials");
      return;
    }

    setIsLoading(true);
    try {
      // First, estimate gas
      const gasEstimate = await Parse.Cloud.run('estimateDeploymentGas', {
        chainId: formData.chain,
        networkId: formData.network,
        factoryContractId: formData.factoryContract,
        appBundleId: formData.appBundle,
        deploymentParams: formData.deploymentOptions
      });

      if (gasEstimate.success) {
        // Show gas estimate to user
        const confirmed = window.confirm(
          `Estimated gas cost: ${gasEstimate.estimation.estimatedCostEth} ETH\n` +
          `Gas limit: ${gasEstimate.estimation.gasLimit}\n\n` +
          `Do you want to proceed with deployment?`
        );

        if (!confirmed) {
          setIsLoading(false);
          return;
        }
      }

      // Deploy contract
      const result = await Parse.Cloud.run('deployContract', {
        chainId: formData.chain,
        networkId: formData.network,
        factoryContractId: formData.factoryContract,
        appBundleId: formData.appBundle,
        deploymentParams: formData.deploymentOptions,
        privateKey: formData.privateKey
      });

      if (result.success) {
        setDeploymentId(result.deploymentId);
        setDeploymentStatus({
          id: result.deploymentId,
          status: 'pending'
        });
        toast.info('Deployment initiated. Monitoring progress...');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to deploy contract';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepContent = () => {
    switch (currentStep) {
      case "chain":
        return (
          <DeploymentStep1 
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case "config":
        return (
          <DeploymentStep2
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case "deploy":
        return (
          <DeploymentStep3
            formData={formData}
            onDeploy={handleDeploy}
            isLoading={isLoading}
          />
        );
    }
  };

  const canNavigateNext = () => {
    switch (currentStep) {
      case "chain":
        return formData.chain && formData.network;
      case "config":
        return formData.factoryContract && formData.appBundle;
      case "deploy":
        return false; // Last step
      default:
        return false;
    }
  };

  const canNavigateBack = () => {
    return currentStep !== "chain" && !isLoading && !deploymentId;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Deploy Smart Contract</CardTitle>
        <CardDescription>
          Deploy a new smart contract to the blockchain
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[
            { id: "chain", label: "Select Network" },
            { id: "config", label: "Configure Contract" },
            { id: "deploy", label: "Deploy" }
          ].map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2
                  ${currentStep === step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < ["chain", "config", "deploy"].indexOf(currentStep)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground bg-background"
                  }
                `}
              >
                {index < ["chain", "config", "deploy"].indexOf(currentStep) ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className="text-sm font-medium">{step.label}</p>
              </div>
              {index < 2 && (
                <div className="w-16 h-[2px] mx-4 bg-muted" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {getStepContent()}
        </div>

        {/* Deployment Status Alert */}
        {deploymentStatus && (
          <Alert className={`mt-4 ${
            deploymentStatus.status === 'deployed' ? 'border-green-500' :
            deploymentStatus.status === 'failed' ? 'border-destructive' :
            'border-yellow-500'
          }`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {deploymentStatus.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deployment in progress...</span>
                </div>
              )}
              {deploymentStatus.status === 'deployed' && (
                <div>
                  <p className="font-medium">Deployment successful!</p>
                  <p className="text-sm mt-1">
                    Contract Address: <code className="font-mono">{deploymentStatus.contractAddress}</code>
                  </p>
                  <p className="text-sm">
                    Transaction: <code className="font-mono">{deploymentStatus.transactionHash}</code>
                  </p>
                  <p className="text-sm">
                    Gas Used: {deploymentStatus.gasUsed}
                  </p>
                </div>
              )}
              {deploymentStatus.status === 'failed' && (
                <div>
                  <p className="font-medium">Deployment failed</p>
                  <p className="text-sm mt-1">{deploymentStatus.error}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={!canNavigateBack()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {currentStep !== "deploy" ? (
          <Button
            onClick={handleNext}
            disabled={!canNavigateNext()}
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleDeploy}
            disabled={isLoading || !!deploymentId}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : deploymentId ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Deployment Started
              </>
            ) : (
              "Deploy Contract"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
