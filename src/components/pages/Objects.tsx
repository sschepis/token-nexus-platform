import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Settings, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomObject } from "@/types/object-manager";
import { Skeleton } from "@/components/ui/skeleton";
import ObjectRecordViewer from "@/components/object-manager/ObjectRecordViewer";
import { useRouter } from "next/router";
import { usePageController } from "@/hooks/usePageController";

const Objects: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentOrg } = useAppSelector(state => state.org);
  const router = useRouter();
  
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("objects");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [isControllerLoading, setIsControllerLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'controller' | 'fallback'>('fallback');

  // Use page controller hook
  const { executeAction, isRegistered } = usePageController({
    pageId: 'object-manager',
    pageName: 'Object Manager',
    description: 'Comprehensive object and record management system',
    category: 'data',
    permissions: ['objects:read', 'objects:write', 'records:read', 'records:write'],
    tags: ['objects', 'records', 'schema', 'data-management']
  });

  // Fallback query for when controller is not available
  const { data: fallbackObjects = [], isLoading: isFallbackLoading } = useQuery({
    queryKey: ["objects", currentOrg?.id],
    queryFn: async () => {
      // Enhanced mock data with more realistic objects
      return [
        {
          id: "Customer__c",
          apiName: "Customer__c",
          label: "Customer",
          description: "Customer information and contact details",
          recordCount: 145,
          fields: [],
          createdAt: "2023-06-10T14:45:00Z",
          updatedAt: "2023-06-10T14:45:00Z",
        },
        {
          id: "Project__c",
          apiName: "Project__c", 
          label: "Project",
          description: "Project management and tracking",
          recordCount: 37,
          fields: [],
          createdAt: "2023-06-12T11:30:00Z",
          updatedAt: "2023-06-12T11:30:00Z",
        },
        {
          id: "Invoice__c",
          apiName: "Invoice__c",
          label: "Invoice",
          description: "Invoice management and billing",
          recordCount: 208,
          fields: [],
          createdAt: "2023-06-08T09:20:00Z",
          updatedAt: "2023-06-08T09:20:00Z",
        },
        {
          id: "Contact__c",
          apiName: "Contact__c",
          label: "Contact",
          description: "Contact information and relationships",
          recordCount: 89,
          fields: [],
          createdAt: "2023-06-15T16:20:00Z",
          updatedAt: "2023-06-15T16:20:00Z",
        }
      ];
    },
    enabled: !isRegistered // Only run fallback when controller is not available
  });

  // Load objects using controller when available
  useEffect(() => {
    const loadObjectsFromController = async () => {
      if (!isRegistered) {
        setDataSource('fallback');
        setObjects(fallbackObjects);
        return;
      }

      try {
        setIsControllerLoading(true);
        setDataSource('controller');
        
        const result = await executeAction('fetchObjects', {
          includeRecordCount: true,
          searchTerm: searchTerm || undefined
        });

        if (result.success && result.data) {
          setObjects((result.data as any).objects || []);
          console.log('✅ Objects loaded from controller registry:', (result.data as any).objects?.length || 0);
        } else {
          console.warn('⚠️ Controller action failed, falling back to mock data:', result.error);
          setDataSource('fallback');
          setObjects(fallbackObjects);
        }
      } catch (error) {
        console.error('❌ Error loading objects from controller:', error);
        setDataSource('fallback');
        setObjects(fallbackObjects);
      } finally {
        setIsControllerLoading(false);
      }
    };

    loadObjectsFromController();
  }, [isRegistered, executeAction, searchTerm, fallbackObjects]);

  const isLoading = isControllerLoading || isFallbackLoading;

  const filteredObjects = objects.filter(obj => 
    obj.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.apiName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (obj.description && obj.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleViewRecords = (objectId: string) => {
    setSelectedObjectId(objectId);
    setActiveTab("records");
  };

  const handleCreateRecord = async (objectId: string) => {
    if (dataSource === 'controller' && isRegistered) {
      try {
        // Use controller to create record
        const result = await executeAction('createRecord', {
          objectApiName: objectId,
          recordData: { Name: 'New Record' },
          validateOnly: true
        });
        
        if (result.success) {
          toast.success(`Ready to create new record for ${objectId}`);
          setSelectedObjectId(objectId);
          setActiveTab("records");
        } else {
          toast.error(result.error || 'Failed to validate record creation');
        }
      } catch (error) {
        toast.error('Error validating record creation');
      }
    } else {
      toast.info(`Creating new record for ${objectId}`);
      setSelectedObjectId(objectId);
      setActiveTab("records");
    }
  };

  const handleManageObject = (objectId: string) => {
    router.push(`/object-manager?objectId=${objectId}`);
  };

  const handleCreateObject = async () => {
    if (dataSource === 'controller' && isRegistered) {
      try {
        const objectName = `CustomObject${Date.now()}__c`;
        const result = await executeAction('createObject', {
          apiName: objectName,
          label: 'New Custom Object',
          description: 'A new custom object created via the Object Manager'
        });
        
        if (result.success) {
          toast.success('Object created successfully!');
          // Reload objects
          const refreshResult = await executeAction('fetchObjects', { includeRecordCount: true });
          if (refreshResult.success && refreshResult.data) {
            setObjects((refreshResult.data as any).objects || []);
          }
        } else {
          toast.error(result.error || 'Failed to create object');
        }
      } catch (error) {
        toast.error('Error creating object');
      }
    } else {
      router.push("/object-manager");
    }
  };
  
  const selectedObject = objects.find(obj => obj.id === selectedObjectId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Objects</h1>
            <p className="text-muted-foreground">
              View and manage your data objects
            </p>
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="Search objects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-[300px]"
            />
            <Button onClick={handleCreateObject}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Object
            </Button>
          </div>
        </div>

        {/* Data Source Indicator */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Data Source: {' '}
            <Badge variant={dataSource === 'controller' ? 'default' : 'secondary'}>
              {dataSource === 'controller' ? 'Controller Registry' : 'Redux Store (Fallback)'}
            </Badge>
            {dataSource === 'controller' && (
              <span className="ml-2 text-green-600">✅ AI Assistant has full access to object management actions</span>
            )}
          </AlertDescription>
        </Alert>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="objects">All Objects</TabsTrigger>
            <TabsTrigger value="records" disabled={!selectedObjectId}>
              {selectedObject ? `${selectedObject.label} Records` : "Records"}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="objects" className="space-y-4">
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Objects</TabsTrigger>
                <TabsTrigger value="recent">Recently Viewed</TabsTrigger>
                <TabsTrigger value="custom">Custom Objects</TabsTrigger>
                <TabsTrigger value="standard">Standard Objects</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => (
                      <Card key={i} className="w-full">
                        <CardHeader>
                          <Skeleton className="h-6 w-2/3" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-3/4" />
                        </CardContent>
                        <CardFooter>
                          <Skeleton className="h-10 w-full" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredObjects.length > 0 ? (
                      filteredObjects.map(obj => (
                        <Card key={obj.id} className="w-full">
                          <CardHeader>
                            <CardTitle className="flex justify-between">
                              <span>{obj.label}</span>
                              <span className="text-sm font-normal text-muted-foreground">
                                {obj.recordCount || 0} records
                              </span>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">{obj.apiName}</p>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">
                              {obj.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Last updated: {new Date(obj.updatedAt).toLocaleDateString()}
                            </p>
                          </CardContent>
                          <CardFooter className="flex justify-between gap-2">
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleViewRecords(obj.id)}
                            >
                              View Records
                            </Button>
                            <Button 
                              className="flex-1"
                              onClick={() => handleCreateRecord(obj.id)}
                            >
                              New Record
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleManageObject(obj.id)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </CardFooter>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-8">
                        <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-lg font-semibold">No objects found</h3>
                        <p className="text-muted-foreground">
                          {searchTerm ? 'Try adjusting your search' : 'Create a new object to get started'}
                        </p>
                        {!searchTerm && (
                          <Button className="mt-4" onClick={handleCreateObject}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Object
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="recent">
                <div className="text-center py-10">
                  <p className="text-muted-foreground">Recently viewed objects will appear here</p>
                </div>
              </TabsContent>
              
              <TabsContent value="custom">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredObjects.filter(obj => obj.apiName.includes('__c')).map(obj => (
                    <Card key={obj.id} className="w-full">
                      <CardHeader>
                        <CardTitle className="flex justify-between">
                          <span>{obj.label}</span>
                          <Badge variant="secondary">Custom</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{obj.apiName}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{obj.description}</p>
                      </CardContent>
                      <CardFooter className="flex justify-between gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewRecords(obj.id)}
                        >
                          View Records
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => handleCreateRecord(obj.id)}
                        >
                          New Record
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="standard">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredObjects.filter(obj => !obj.apiName.includes('__c')).map(obj => (
                    <Card key={obj.id} className="w-full">
                      <CardHeader>
                        <CardTitle className="flex justify-between">
                          <span>{obj.label}</span>
                          <Badge variant="outline">Standard</Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{obj.apiName}</p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{obj.description}</p>
                      </CardContent>
                      <CardFooter className="flex justify-between gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewRecords(obj.id)}
                        >
                          View Records
                        </Button>
                        <Button 
                          className="flex-1"
                          onClick={() => handleCreateRecord(obj.id)}
                        >
                          New Record
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="records">
            {selectedObject && (
              <ObjectRecordViewer 
                objectId={selectedObject.id} 
                objectName={selectedObject.label} 
                objectApiName={selectedObject.apiName}
                onBack={() => setActiveTab("objects")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Objects;
