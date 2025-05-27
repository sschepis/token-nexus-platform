import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Code,
  ExternalLink,
  Copy,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Parse from "parse";
import { useAppSelector } from "@/store/hooks";

interface ABIParameter {
  name: string;
  type: string;
  internalType?: string;
}

interface ABIItem {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: ABIParameter[];
  outputs?: ABIParameter[];
  anonymous?: boolean;
  constant?: boolean;
  payable?: boolean;
}

interface Contract {
  id: string;
  name: string;
  address: string;
  networkId: string;
  abi: ABIItem[];
}

interface Method {
  name: string;
  type: string;
  stateMutability: string;
  inputs: ABIParameter[];
  outputs: ABIParameter[];
}

type ContractCallResult = string | number | boolean | Record<string, unknown> | unknown[];

interface Network {
  id: string;
  displayName: string;
  explorerUrl: string;
}

export const ContractInteractor: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [methodInputs, setMethodInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ContractCallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load available networks
  useEffect(() => {
    loadNetworks();
  }, []);

  // Load contracts when network changes
  useEffect(() => {
    if (selectedNetwork) {
      loadContracts();
    }
  }, [selectedNetwork]);

  // Parse ABI when contract changes
  useEffect(() => {
    if (selectedContract) {
      parseMethods();
    }
  }, [selectedContract]);

  const loadNetworks = async () => {
    try {
      const result = await Parse.Cloud.run("getOrgNetworks");
      setNetworks(result.networks || []);
      if (result.networks.length > 0) {
        setSelectedNetwork(result.networks[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load networks";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const loadContracts = async () => {
    try {
      setIsLoading(true);
      const result = await Parse.Cloud.run("getOrgContracts", {
        networkId: selectedNetwork,
      });
      setContracts(result.contracts || []);
      setSelectedContract(null);
      setSelectedMethod(null);
      setResult(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load contracts";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseMethods = () => {
    if (!selectedContract || !selectedContract.abi) {
      setMethods([]);
      return;
    }

    const readMethods = selectedContract.abi
      .filter((item) =>
        item.type === 'function' &&
        (item.stateMutability === 'view' || item.stateMutability === 'pure')
      )
      .map((item) => ({
        name: item.name || '',
        type: item.type,
        stateMutability: item.stateMutability || '',
        inputs: item.inputs || [],
        outputs: item.outputs || [],
      }));

    setMethods(readMethods);
  };

  const handleMethodSelect = (method: Method) => {
    setSelectedMethod(method);
    setMethodInputs({});
    setResult(null);
    setError(null);
  };

  const handleInputChange = (inputName: string, value: string) => {
    setMethodInputs(prev => ({
      ...prev,
      [inputName]: value,
    }));
  };

  const executeMethod = async () => {
    if (!selectedContract || !selectedMethod) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      // Parse inputs based on type
      const parsedInputs = selectedMethod.inputs.map(input => {
        const value = methodInputs[input.name] || "";
        
        // Handle different input types
        if (input.type.includes('uint') || input.type.includes('int')) {
          return value;
        } else if (input.type === 'bool') {
          return value.toLowerCase() === 'true';
        } else if (input.type.includes('[]')) {
          // Handle arrays
          try {
            return JSON.parse(value) as unknown[];
          } catch {
            return value.split(',').map(v => v.trim());
          }
        } else {
          return value;
        }
      });

      const response = await Parse.Cloud.run("readContract", {
        networkId: selectedNetwork,
        contractAddress: selectedContract.address,
        methodName: selectedMethod.name,
        methodAbi: selectedMethod,
        params: parsedInputs,
      });

      setResult(response.result);
      
      // Log the interaction
      await Parse.Cloud.run("logContractInteraction", {
        contractId: selectedContract.id,
        method: selectedMethod.name,
        params: parsedInputs,
        result: response.result,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute method";
      setError(errorMessage);
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatResult = (result: ContractCallResult | null): string => {
    if (result === null || result === undefined) return "null";
    if (typeof result === 'boolean') return result.toString();
    if (typeof result === 'string' || typeof result === 'number') return result.toString();
    if (Array.isArray(result)) {
      return JSON.stringify(result, null, 2);
    }
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    // This should never be reached, but TypeScript needs it
    return String(result);
  };

  const getInputPlaceholder = (type: string): string => {
    if (type.includes('address')) return '0x...';
    if (type.includes('uint') || type.includes('int')) return '123';
    if (type === 'bool') return 'true or false';
    if (type.includes('[]')) return 'value1, value2, value3';
    return 'Enter value';
  };

  return (
    <div className="space-y-6">
      {/* Network and Contract Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Selection</CardTitle>
          <CardDescription>Select a network and contract to interact with</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map(network => (
                    <SelectItem key={network.id} value={network.id}>
                      {network.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contract</Label>
              <Select 
                value={selectedContract?.id || ""} 
                onValueChange={(id) => setSelectedContract(contracts.find(c => c.id === id) || null)}
                disabled={contracts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map(contract => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedContract && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Code className="h-4 w-4" />
              <code className="text-sm">{formatAddress(selectedContract.address)}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(selectedContract.address)}
              >
                <Copy className="h-3 w-3" />
              </Button>
              {networks.find(n => n.id === selectedNetwork)?.explorerUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  asChild
                >
                  <a 
                    href={`${networks.find(n => n.id === selectedNetwork)?.explorerUrl}/address/${selectedContract.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Method Selection and Execution */}
      {selectedContract && methods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Read Methods</CardTitle>
            <CardDescription>Select a method to call</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {methods.map((method, index) => (
                <AccordionItem key={index} value={`method-${index}`}>
                  <AccordionTrigger
                    onClick={() => handleMethodSelect(method)}
                    className="hover:no-underline"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{method.stateMutability}</Badge>
                      <span className="font-mono text-sm">{method.name}</span>
                      {method.inputs.length > 0 && (
                        <span className="text-muted-foreground text-sm">
                          ({method.inputs.length} params)
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {method.inputs.length > 0 && (
                        <div className="space-y-3">
                          {method.inputs.map((input, i) => (
                            <div key={i} className="space-y-2">
                              <Label>
                                {input.name || `param${i}`} 
                                <span className="text-muted-foreground ml-2">({input.type})</span>
                              </Label>
                              <Input
                                placeholder={getInputPlaceholder(input.type)}
                                value={methodInputs[input.name || `param${i}`] || ""}
                                onChange={(e) => handleInputChange(input.name || `param${i}`, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={executeMethod}
                        disabled={isLoading || selectedMethod?.name !== method.name}
                        className="w-full"
                      >
                        {isLoading && selectedMethod?.name === method.name ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Execute
                          </>
                        )}
                      </Button>

                      {selectedMethod?.name === method.name && (
                        <>
                          {error && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )}

                          {result !== null && !error && (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-2">
                                  <div className="font-medium">Result:</div>
                                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                    {formatResult(result)}
                                  </pre>
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {selectedContract && methods.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No read methods found in this contract's ABI.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};