import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { objectManagerService } from "@/services/objectManagerService"; // Assumed to be imported or will be
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
      const response = await objectManagerService.fetchObjects(currentOrg?.id || ''); // Call real backend service
      return response; // objectManagerService.fetchObjects already returns CustomObject[]
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
    <>
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
    </>
  );
};

export default ObjectManager;
