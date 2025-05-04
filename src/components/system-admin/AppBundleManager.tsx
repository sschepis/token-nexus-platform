
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BundleUpload } from "./bundles/BundleUpload";
import { VersionManagement } from "./bundles/VersionManagement";

export const AppBundleManager = () => {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>App Bundle Management</CardTitle>
        <CardDescription>Upload and manage application bundles for deployment</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="upload">Upload Bundle</TabsTrigger>
            <TabsTrigger value="versions">Version Management</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <BundleUpload />
          </TabsContent>

          <TabsContent value="versions">
            <VersionManagement />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
