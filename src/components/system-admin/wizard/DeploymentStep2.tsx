
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface DeploymentStep2Props {
  formData: {
    chain: string;
    network: string;
    factoryContract: string;
    appBundle: string;
    [key: string]: any;
  };
  updateFormData: (data: Partial<typeof formData>) => void;
}

export const DeploymentStep2: React.FC<DeploymentStep2Props> = ({ formData, updateFormData }) => {
  const [authMethod, setAuthMethod] = useState<"privateKey" | "wallet">("wallet");

  const appBundles = [
    { id: "standard", name: "Standard App Bundle (v1.2.0)" },
    { id: "professional", name: "Professional App Bundle (v1.1.5)" },
    { id: "enterprise", name: "Enterprise App Bundle (v1.0.8)" }
  ];

  const factoryContracts = [
    { id: "basic", name: "Basic Factory" },
    { id: "advanced", name: "Advanced Factory (ERC-1167 Clone)" },
    { id: "premium", name: "Premium Factory (Diamond Standard)" }
  ];

  const handleAuthMethodChange = (value: "privateKey" | "wallet") => {
    setAuthMethod(value);
    updateFormData({ 
      authMethod: value,
      credentials: {}  // Reset credentials when changing auth method
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="factory-select">Factory Contract</Label>
          <Select 
            value={formData.factoryContract} 
            onValueChange={(value) => updateFormData({ factoryContract: value })}
          >
            <SelectTrigger id="factory-select">
              <SelectValue placeholder="Select a factory contract" />
            </SelectTrigger>
            <SelectContent>
              {factoryContracts.map(contract => (
                <SelectItem key={contract.id} value={contract.id}>
                  {contract.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bundle-select">App Bundle</Label>
          <Select 
            value={formData.appBundle} 
            onValueChange={(value) => updateFormData({ appBundle: value })}
          >
            <SelectTrigger id="bundle-select">
              <SelectValue placeholder="Select an app bundle" />
            </SelectTrigger>
            <SelectContent>
              {appBundles.map(bundle => (
                <SelectItem key={bundle.id} value={bundle.id}>
                  {bundle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4">
          <Label>Authentication Method</Label>
          <Tabs value={authMethod} onValueChange={(v) => handleAuthMethodChange(v as any)} className="w-full mt-2">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="wallet">Web3 Wallet</TabsTrigger>
              <TabsTrigger value="privateKey">Private Key</TabsTrigger>
            </TabsList>

            <TabsContent value="wallet" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect with your Web3 wallet to sign the deployment transaction.
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Auto-connect on deployment</p>
                    </div>
                    <Switch 
                      checked={formData.autoConnect} 
                      onCheckedChange={(checked) => updateFormData({ autoConnect: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privateKey" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter your private key securely. It will be encrypted locally and never stored in plain text.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="private-key">Private Key</Label>
                      <Input 
                        id="private-key" 
                        type="password" 
                        placeholder="Enter your private key"
                        value={formData.credentials?.privateKey || ""}
                        onChange={(e) => updateFormData({ 
                          credentials: { ...formData.credentials, privateKey: e.target.value } 
                        })}
                      />
                      <p className="text-xs text-muted-foreground">Your key is encrypted with AES-256 and stored only for this session.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="pt-4">
          <Label className="mb-2 block">Deployment Options</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="auto-verify"
                checked={formData.deploymentOptions?.autoVerify || false}
                onCheckedChange={(checked) => updateFormData({ 
                  deploymentOptions: { ...formData.deploymentOptions, autoVerify: checked } 
                })}
              />
              <Label htmlFor="auto-verify">Auto-verify contract on block explorer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="enable-proxy"
                checked={formData.deploymentOptions?.enableProxy || false}
                onCheckedChange={(checked) => updateFormData({ 
                  deploymentOptions: { ...formData.deploymentOptions, enableProxy: checked } 
                })}
              />
              <Label htmlFor="enable-proxy">Enable proxy pattern for upgrades</Label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
