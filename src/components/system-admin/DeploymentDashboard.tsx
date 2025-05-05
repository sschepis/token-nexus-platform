
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DeploymentStatus } from "./deployments/DeploymentStatus";
import { ContractAddressTracker } from "./deployments/ContractAddressTracker";

export const DeploymentDashboard = () => {
  const [activeTab, setActiveTab] = useState("status");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Deployment Dashboard</CardTitle>
        <CardDescription>Track and manage your contract deployments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="status">Deployment Status</TabsTrigger>
            <TabsTrigger value="addresses">Contract Addresses</TabsTrigger>
          </TabsList>

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
