
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ObjectList from "@/components/object-manager/ObjectList";
import { CustomObject } from "@/types/object-manager";
import CreateObjectModal from "@/components/object-manager/CreateObjectModal";
import ObjectDetailView from "@/components/object-manager/ObjectDetailView";

const ObjectManager: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("objects");
  const [selectedObject, setSelectedObject] = useState<CustomObject | null>(null);
  const { currentOrg } = useAppSelector(state => state.org);
  
  // Query custom objects
  const { data: objects = [], isLoading, refetch } = useQuery({
    queryKey: ["customObjects", currentOrg?.id],
    queryFn: async () => {
      // Mock data for now
      return [
        {
          id: "obj-123",
          apiName: "Customer__c",
          label: "Customer",
          description: "Customer information",
          fields: [
            { id: "field-1", apiName: "Name", label: "Name", type: "text", required: true },
            { id: "field-2", apiName: "Email__c", label: "Email", type: "email", required: true },
            { id: "field-3", apiName: "Phone__c", label: "Phone", type: "phone", required: false },
            { id: "field-4", apiName: "Status__c", label: "Status", type: "picklist", required: true, 
              options: ["Active", "Inactive", "Pending"] }
          ],
          createdAt: "2023-04-15T10:30:00Z",
          updatedAt: "2023-06-10T14:45:00Z",
        },
        {
          id: "obj-456",
          apiName: "Project__c",
          label: "Project",
          description: "Project management",
          fields: [
            { id: "field-5", apiName: "Name", label: "Name", type: "text", required: true },
            { id: "field-6", apiName: "Customer__c", label: "Customer", type: "lookup", required: true, 
              referenceTo: "Customer__c" },
            { id: "field-7", apiName: "StartDate__c", label: "Start Date", type: "date", required: true },
            { id: "field-8", apiName: "EndDate__c", label: "End Date", type: "date", required: false }
          ],
          createdAt: "2023-04-20T09:15:00Z",
          updatedAt: "2023-06-12T11:30:00Z",
        }
      ] as CustomObject[];
    }
  });

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    toast.success("Object created successfully");
    refetch();
  };

  const handleObjectSelect = (object: CustomObject) => {
    setSelectedObject(object);
    setSelectedTab("details");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Object Manager</h1>
            <p className="text-muted-foreground">
              Create and manage custom objects and fields
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Object
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Custom Object Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="objects">Objects</TabsTrigger>
                <TabsTrigger value="details" disabled={!selectedObject}>
                  {selectedObject ? selectedObject.label : "Object Details"}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="objects" className="p-4">
                <div className="mb-4">
                  <Input 
                    placeholder="Search objects..." 
                    className="max-w-sm"
                  />
                </div>
                <ObjectList 
                  objects={objects} 
                  isLoading={isLoading} 
                  onObjectSelect={handleObjectSelect}
                />
              </TabsContent>
              
              <TabsContent value="details">
                {selectedObject && (
                  <ObjectDetailView 
                    object={selectedObject}
                    onUpdate={() => refetch()}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <CreateObjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </AppLayout>
  );
};

export default ObjectManager;
