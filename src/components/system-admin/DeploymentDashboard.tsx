
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeploymentStatus } from "./deployments/DeploymentStatus";
import { ContractAddressTracker } from "./deployments/ContractAddressTracker";
import { BlockchainImportManager } from "./blockchain/BlockchainImportManager";

export const DeploymentDashboard = () => {
  const [activeTab, setActiveTab] = useState("blockchain");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Blockchain Management</CardTitle>
        <CardDescription>Import and manage blockchain contracts and deployments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="blockchain">Blockchain Contracts</TabsTrigger>
            <TabsTrigger value="status">Deployment Status</TabsTrigger>
            <TabsTrigger value="addresses">Contract Addresses</TabsTrigger>
          </TabsList>

          <TabsContent value="blockchain">
            <BlockchainImportManager />
          </TabsContent>

          <TabsContent value="status">
            <DeploymentStatus />
          </TabsContent>

          <TabsContent value="addresses">
            <ContractAddressTracker />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
