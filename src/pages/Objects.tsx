
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomObject } from "@/types/object-manager";
import { Skeleton } from "@/components/ui/skeleton";

const Objects: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentOrg } = useAppSelector(state => state.org);
  
  // Query object data
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ["objects", currentOrg?.id],
    queryFn: async () => {
      // Mock data for now
      return [
        {
          id: "obj-123",
          apiName: "Customer__c",
          label: "Customer",
          description: "Customer information",
          recordCount: 145,
          updatedAt: "2023-06-10T14:45:00Z",
        },
        {
          id: "obj-456",
          apiName: "Project__c",
          label: "Project",
          description: "Project management",
          recordCount: 37,
          updatedAt: "2023-06-12T11:30:00Z",
        },
        {
          id: "obj-789",
          apiName: "Invoice__c",
          label: "Invoice",
          description: "Invoice management",
          recordCount: 208,
          updatedAt: "2023-06-08T09:20:00Z",
        }
      ];
    }
  });

  const filteredObjects = objects.filter(obj => 
    obj.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    obj.apiName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewRecords = (objectId: string) => {
    toast.info(`Viewing records for ${objectId}`);
    // Navigate to object records view (to be implemented)
  };

  const handleCreateRecord = (objectId: string) => {
    toast.info(`Creating new record for ${objectId}`);
    // Navigate to create record form (to be implemented)
  };

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
            <Button onClick={() => toast.info("Create new object in Object Manager")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Object
            </Button>
          </div>
        </div>
        
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
                {Array(3).fill(0).map((_, i) => (
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
                            {obj.recordCount} records
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
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-8">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No objects found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search or create a new object
                    </p>
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
            <div className="text-center py-10">
              <p className="text-muted-foreground">Custom objects will appear here</p>
            </div>
          </TabsContent>
          
          <TabsContent value="standard">
            <div className="text-center py-10">
              <p className="text-muted-foreground">Standard objects will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Objects;
