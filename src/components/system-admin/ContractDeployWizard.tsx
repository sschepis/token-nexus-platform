
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeploymentStep1 } from "./wizard/DeploymentStep1";
import { DeploymentStep2 } from "./wizard/DeploymentStep2";
import { DeploymentStep3 } from "./wizard/DeploymentStep3";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

type WizardStep = "chain" | "config" | "deploy";

export const ContractDeployWizard = () => {
  const [currentStep, setCurrentStep] = useState<WizardStep>("chain");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    chain: "",
    network: "",
    factoryContract: "",
    appBundle: "",
    deploymentOptions: {},
    credentials: {}
  });

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

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
    setIsLoading(true);
    try {
      // In a real implementation, this would call a deployment service
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Deployment initiated successfully!");
      // Here you would dispatch to your deploymentSlice
    } catch (error) {
      toast.error("Deployment failed. Please try again.");
      console.error("Deployment error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Contract Deployment Wizard</CardTitle>
        <CardDescription>Deploy smart contract factories to supported blockchains</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="chain" disabled>Chain Selection</TabsTrigger>
            <TabsTrigger value="config" disabled>Configuration</TabsTrigger>
            <TabsTrigger value="deploy" disabled>Deployment</TabsTrigger>
          </TabsList>

          <TabsContent value="chain" className="mt-6">
            <DeploymentStep1 
              formData={formData} 
              updateFormData={updateFormData} 
            />
          </TabsContent>
          
          <TabsContent value="config" className="mt-6">
            <DeploymentStep2 
              formData={formData} 
              updateFormData={updateFormData} 
            />
          </TabsContent>
          
          <TabsContent value="deploy" className="mt-6">
            <DeploymentStep3 
              formData={formData} 
              isLoading={isLoading}
              onDeploy={handleDeploy}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={currentStep === "chain" || isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        
        {currentStep !== "deploy" ? (
          <Button onClick={handleNext}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button 
            onClick={handleDeploy} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>Deploying...</>
            ) : (
              <>Deploy <Check className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
