import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
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
import { usePageController } from "@/hooks/usePageController";
import { objectManagerPageController } from "@/controllers/ObjectManagerPageController";

const ObjectManagerPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("objects");
  const [selectedObject, setSelectedObject] = useState<CustomObject | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentOrg } = useAppSelector(state => state.org);
  const actionsRegisteredRef = useRef(false);
  
  // Initialize page controller
  const pageController = usePageController({
    pageId: 'object-manager',
    pageName: 'Object Manager',
    description: 'Comprehensive object and record management system',
    category: 'data',
    permissions: ['objects:read', 'objects:write', 'records:read', 'records:write'],
    tags: ['objects', 'records', 'schema', 'data-management']
  });

  // Register the ObjectManagerPageController actions (only once)
  useEffect(() => {
    if (pageController.isRegistered && !actionsRegisteredRef.current) {
      // Register all actions from the existing controller instance
      objectManagerPageController.actions.forEach((action) => {
        pageController.registerAction(action);
      });
      
      actionsRegisteredRef.current = true;
      console.log('[DEBUG ObjectManager] Registered ObjectManagerPageController actions');
    }
  }, [pageController.isRegistered, pageController.registerAction]);
  
  // Fetch objects using the controller
  const { data: objects = [], isLoading, refetch } = useQuery({
    queryKey: ["customObjects", currentOrg?.id, searchTerm],
    queryFn: async () => {
      try {
        console.log('[DEBUG ObjectManager] Fetching objects with searchTerm:', searchTerm);
        const result = await pageController.executeAction('fetchObjects', {
          includeRecordCount: true,
          searchTerm: searchTerm || undefined
        });
        
        if (result.success && result.data && typeof result.data === 'object' && 'objects' in result.data) {
          console.log('[DEBUG ObjectManager] Successfully fetched objects:', (result.data as any).objects);
          return (result.data as any).objects as CustomObject[];
        } else {
          console.error('[DEBUG ObjectManager] Failed to fetch objects:', result.error);
          toast.error(result.error || 'Failed to fetch objects');
          return [];
        }
      } catch (error) {
        console.error('[DEBUG ObjectManager] Error fetching objects:', error);
        toast.error('Failed to fetch objects');
        return [];
      }
    },
    enabled: pageController.isRegistered && !!currentOrg?.id
  });

  const handleCreateSuccess = async (objectData: any) => {
    try {
      console.log('[DEBUG ObjectManager] Creating object:', objectData);
      const result = await pageController.executeAction('createObject', objectData);
      
      if (result.success) {
        setIsCreateModalOpen(false);
        toast.success("Object created successfully");
        refetch();
      } else {
        console.error('[DEBUG ObjectManager] Failed to create object:', result.error);
        toast.error(result.error || 'Failed to create object');
      }
    } catch (error) {
      console.error('[DEBUG ObjectManager] Error creating object:', error);
      toast.error('Failed to create object');
    }
  };

  const handleObjectSelect = (object: CustomObject) => {
    setSelectedObject(object);
    setSelectedTab("details");
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return (
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
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
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

        <CreateObjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
  );
};

export default ObjectManagerPage;