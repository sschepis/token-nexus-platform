import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Diamond, 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Network,
  Settings,
  Rocket
} from 'lucide-react';
import { useActionExecutor } from '@/hooks/useActionExecutor';
import { useToast } from '@/hooks/use-toast';
import { useOrganizationContext } from '@/hooks/useOrganizationContext';

interface DeploymentWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface DeploymentConfig {
  name: string;
  symbol: string;
  blockchain: string;
  network: string;
}

const BLOCKCHAIN_OPTIONS = [
  { value: 'ethereum', label: 'Ethereum', networks: ['mainnet', 'sepolia', 'goerli'] },
  { value: 'polygon', label: 'Polygon', networks: ['polygon', 'mumbai'] },
  { value: 'arbitrum', label: 'Arbitrum', networks: ['arbitrum', 'arbitrum-goerli'] },
  { value: 'optimism', label: 'Optimism', networks: ['optimism', 'optimism-goerli'] }
];

const NETWORK_DESCRIPTIONS: Record<string, string> = {
  'mainnet': 'Ethereum Mainnet - Production network with real ETH',
  'sepolia': 'Ethereum Sepolia - Test network for development',
  'goerli': 'Ethereum Goerli - Test network (deprecated)',
  'polygon': 'Polygon Mainnet - Production network with real MATIC',
  'mumbai': 'Polygon Mumbai - Test network for development',
  'arbitrum': 'Arbitrum One - Layer 2 scaling solution',
  'arbitrum-goerli': 'Arbitrum Goerli - Test network',
  'optimism': 'Optimism Mainnet - Layer 2 scaling solution',
  'optimism-goerli': 'Optimism Goerli - Test network'
};

export const DeploymentWizard: React.FC<DeploymentWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const { executeAction, isLoading } = useActionExecutor();
  const { toast } = useToast();
  const { currentOrg } = useOrganizationContext();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<DeploymentConfig>({
    name: currentOrg?.name ? `${currentOrg.name} Diamond` : '',
    symbol: currentOrg?.name ? `${currentOrg.name.substring(0, 3).toUpperCase()}D` : '',
    blockchain: 'ethereum',
    network: 'sepolia'
  });
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deployedDiamond, setDeployedDiamond] = useState<any>(null);

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeploy = async () => {
    try {
      setDeploymentStatus('deploying');
      setDeploymentProgress(0);
      setDeploymentError(null);

      // Simulate deployment progress
      const progressInterval = setInterval(() => {
        setDeploymentProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = await executeAction('smart-contract-studio', 'createOrganizationDiamond', config);
      
      clearInterval(progressInterval);
      setDeploymentProgress(100);
      setDeploymentStatus('success');
      setDeployedDiamond(result.data.diamond);

      toast({
        title: "Diamond Deployed Successfully!",
        description: "Your diamond contract has been deployed and is ready to use.",
      });

      // Auto-complete after a short delay
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      setDeploymentStatus('error');
      setDeploymentError(error instanceof Error ? error.message : 'Deployment failed');
      
      toast({
        title: "Deployment Failed",
        description: error instanceof Error ? error.message : 'Failed to deploy diamond contract',
        variant: "destructive",
      });
    }
  };

  const getAvailableNetworks = () => {
    const blockchain = BLOCKCHAIN_OPTIONS.find(b => b.value === config.blockchain);
    return blockchain?.networks || [];
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return config.name.trim().length > 0 && config.symbol.trim().length > 0;
      case 2:
        return config.blockchain && config.network;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Diamond className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Configure Your Diamond</h2>
              <p className="text-gray-600">
                Set up the basic properties for your organization's diamond contract
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Diamond Name</Label>
                <Input
                  id="name"
                  value={config.name}
                  onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter diamond contract name"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  A descriptive name for your diamond contract
                </p>
              </div>

              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={config.symbol}
                  onChange={(e) => setConfig(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="Enter symbol (e.g., ORGD)"
                  maxLength={10}
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  A short symbol to identify your diamond (max 10 characters)
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Network className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Choose Network</h2>
              <p className="text-gray-600">
                Select the blockchain network for your diamond deployment
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="blockchain">Blockchain</Label>
                <Select
                  value={config.blockchain}
                  onValueChange={(value) => {
                    const blockchain = BLOCKCHAIN_OPTIONS.find(b => b.value === value);
                    setConfig(prev => ({ 
                      ...prev, 
                      blockchain: value,
                      network: blockchain?.networks[0] || ''
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select blockchain" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCKCHAIN_OPTIONS.map(blockchain => (
                      <SelectItem key={blockchain.value} value={blockchain.value}>
                        {blockchain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="network">Network</Label>
                <Select
                  value={config.network}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, network: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableNetworks().map(network => (
                      <SelectItem key={network} value={network}>
                        <div>
                          <div className="font-medium capitalize">{network}</div>
                          <div className="text-sm text-gray-500">
                            {NETWORK_DESCRIPTIONS[network]}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.network && (
                <Alert>
                  <Network className="h-4 w-4" />
                  <AlertDescription>
                    {NETWORK_DESCRIPTIONS[config.network]}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Review & Deploy</h2>
              <p className="text-gray-600">
                Review your configuration and deploy your diamond contract
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Deployment Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Name</Label>
                    <p className="text-sm text-gray-900">{config.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Symbol</Label>
                    <p className="text-sm text-gray-900">{config.symbol}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Blockchain</Label>
                    <p className="text-sm text-gray-900 capitalize">{config.blockchain}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Network</Label>
                    <p className="text-sm text-gray-900 capitalize">{config.network}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {deploymentStatus === 'deploying' && (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <div>
                      <h3 className="font-medium">Deploying Diamond Contract</h3>
                      <p className="text-sm text-gray-600">This may take a few minutes...</p>
                    </div>
                    <Progress value={deploymentProgress} className="w-full" />
                    <p className="text-sm text-gray-500">{deploymentProgress}% complete</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {deploymentStatus === 'success' && deployedDiamond && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Diamond deployed successfully!</p>
                    <p className="text-sm">
                      Contract Address: <code className="bg-gray-100 px-1 rounded">{deployedDiamond.contractAddress}</code>
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {deploymentStatus === 'error' && deploymentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Deployment failed</p>
                    <p className="text-sm">{deploymentError}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Rocket className="h-5 w-5" />
              <span>Deploy Diamond Contract</span>
            </CardTitle>
            <div className="text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
        </CardHeader>
        <CardContent className="p-6">
          {renderStep()}
        </CardContent>
        <div className="flex items-center justify-between p-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handlePrevious}
            disabled={isLoading || deploymentStatus === 'deploying'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid(currentStep) || isLoading}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleDeploy}
              disabled={!isStepValid(currentStep) || isLoading || deploymentStatus === 'deploying' || deploymentStatus === 'success'}
            >
              {deploymentStatus === 'deploying' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : deploymentStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Deployed
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy Diamond
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};