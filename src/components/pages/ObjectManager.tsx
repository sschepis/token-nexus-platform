import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ObjectList from "@/components/object-manager/ObjectList";
import { CustomObject } from "@/types/object-manager";
import CreateObjectModal from "@/components/object-manager/CreateObjectModal";
import ObjectDetailView from "@/components/object-manager/ObjectDetailView";

const ObjectManager: React.FC = () => {
  const { currentOrg } = useAppSelector(state => state.org);
  const { orgId: authOrgId } = useAppSelector(state => state.auth);
  const { toast } = useToast();
  
  const effectiveOrgId = currentOrg?.id || authOrgId;
  
  // Use standardized page controller integration
  const pageController = usePageController({
    pageId: 'object-manager',
    pageName: 'Object Manager',
    description: 'Create and manage custom objects and fields',
    category: 'data',
    permissions: ['objects:read'],
    tags: ['objects', 'schema', 'management', 'data']
  });

  // Permission checks - System admins (isAdmin=true) automatically get all permissions via usePermission hook
  const { hasPermission, checkAnyPermission, user, isAuthenticated } = usePermission();
  
  console.log('[ObjectManager] Permission debug:', {
    isAuthenticated,
    userId: user?.id,
    userIsAdmin: user?.isAdmin,
    user: user
  });
  
  const canRead = checkAnyPermission(['objects:read', 'objects:write', 'objects:manage']);
  const canWrite = checkAnyPermission(['objects:write', 'objects:manage']);
  const canManage = checkAnyPermission(['objects:manage']);
  
  console.log('[ObjectManager] Permission results:', { canRead, canWrite, canManage });

  // Local state management
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("objects");
  const [selectedObject, setSelectedObject] = useState<CustomObject | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controllerError, setControllerError] = useState<string | null>(null);

  // Load objects function
  const loadObjects = async () => {
    if (!pageController.isRegistered || !canRead) {
      setControllerError("Cannot load objects: Controller not available or insufficient permissions");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('fetchObjects', { 
        orgId: effectiveOrgId || '',
        includeRecordCount: true 
      });
      
      if (result.success && result.data) {
        const objectsData = result.data as { objects: CustomObject[] };
        setObjects(objectsData.objects || []);
      } else {
        setControllerError(`Failed to load objects: ${result.error}`);
        console.error('Load objects error:', result.error);
      }
    } catch (error) {
      console.error('Error loading objects:', error);
      setControllerError("Failed to load objects");
    } finally {
      setIsLoading(false);
    }
  };

  // Load objects on component mount
  useEffect(() => {
    if (pageController.isRegistered) {
      loadObjects();
    }
  }, [pageController.isRegistered]);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
    toast({
      title: "Success",
      description: "Object created successfully"
    });
    loadObjects();
  };

  const handleObjectSelect = (object: CustomObject) => {
    setSelectedObject(object);
    setSelectedTab("details");
  };

  // Filter objects based on search term
  const filteredObjects = objects.filter((object) => {
    return searchTerm === "" ||
           object.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           object.apiName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Permission check - show error if user doesn't have read access
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Object Manager</h1>
            <p className="text-muted-foreground">
              Create and manage custom objects and fields
            </p>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view objects. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!canWrite}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Object
          </Button>
        </div>

        {/* Controller Error Display */}
        {controllerError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{controllerError}</AlertDescription>
          </Alert>
        )}

        {/* Permission Warning for Write Access */}
        {!canWrite && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have read-only access to objects. Contact your administrator for write permissions.
            </AlertDescription>
          </Alert>
        )}
        
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading objects...</span>
                  </div>
                ) : (
                  <ObjectList
                    objects={filteredObjects}
                    isLoading={false}
                    onObjectSelect={handleObjectSelect}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="details">
                {selectedObject && (
                  <ObjectDetailView
                    object={selectedObject}
                    onUpdate={() => loadObjects()}
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
