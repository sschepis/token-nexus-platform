
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  LayoutTemplate, 
  PlusCircle,
  Search,
  Component as ComponentIcon
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ComponentCard from "@/components/component-library/ComponentCard";
import CreateComponentDialog from "@/components/component-library/CreateComponentDialog";
import ComponentPreview from "@/components/component-library/ComponentPreview";
import { CustomComponent } from "@/types/component-library";
import { CustomObject } from "@/types/object-manager";

const ComponentLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedComponent, setSelectedComponent] = useState<CustomComponent | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const { currentOrg } = useAppSelector(state => state.org);

  // Get custom components
  const { data: components = [], isLoading, refetch } = useQuery({
    queryKey: ["customComponents", currentOrg?.id],
    queryFn: async () => {
      // Mock data - in production, this would fetch from your database
      return [
        {
          id: "comp-123",
          name: "Customer Card",
          description: "Displays customer information in a card format",
          type: "display",
          objectBinding: "Customer__c",
          preview: "/placeholder.svg",
          elements: [
            {
              id: "el-1",
              type: "card",
              props: { title: "Customer Information" },
              children: [
                {
                  id: "el-2",
                  type: "text",
                  props: { fieldBinding: "Name", label: "Name" },
                  children: []
                },
                {
                  id: "el-3",
                  type: "text",
                  props: { fieldBinding: "Email__c", label: "Email" },
                  children: []
                }
              ]
            }
          ],
          createdAt: "2023-06-10T14:45:00Z",
          updatedAt: "2023-06-12T11:30:00Z"
        },
        {
          id: "comp-456",
          name: "Project Form",
          description: "Form for creating or editing projects",
          type: "form",
          objectBinding: "Project__c",
          preview: "/placeholder.svg",
          elements: [
            {
              id: "el-4",
              type: "form",
              props: { submitLabel: "Save Project" },
              children: [
                {
                  id: "el-5",
                  type: "input",
                  props: { fieldBinding: "Name", label: "Project Name" },
                  children: []
                },
                {
                  id: "el-6",
                  type: "datepicker",
                  props: { fieldBinding: "StartDate__c", label: "Start Date" },
                  children: []
                }
              ]
            }
          ],
          createdAt: "2023-06-15T09:30:00Z",
          updatedAt: "2023-06-16T13:45:00Z"
        }
      ] as CustomComponent[];
    }
  });

  // Get custom objects
  const { data: objects = [] } = useQuery({
    queryKey: ["customObjects", currentOrg?.id],
    queryFn: async () => {
      // Mock data - in production, this would fetch from your database
      return [
        {
          id: "obj-123",
          apiName: "Customer__c",
          label: "Customer",
          description: "Customer information",
          fields: [
            { id: "field-1", apiName: "Name", label: "Name", type: "text", required: true },
            { id: "field-2", apiName: "Email__c", label: "Email", type: "email", required: true }
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
            { id: "field-7", apiName: "StartDate__c", label: "Start Date", type: "date", required: true }
          ],
          createdAt: "2023-04-20T09:15:00Z",
          updatedAt: "2023-06-12T11:30:00Z",
        }
      ] as CustomObject[];
    }
  });

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    toast.success("Component created successfully");
    refetch();
  };

  const filteredComponents = searchQuery
    ? components.filter(comp => 
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.objectBinding.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : components;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Component Library</h1>
            <p className="text-muted-foreground">
              Create and manage reusable components bound to your data objects
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Component
          </Button>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedComponent}>
              Component Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading components...</div>
            ) : filteredComponents.length === 0 ? (
              <Card className="py-8">
                <CardContent className="text-center">
                  <ComponentIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No components found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Try a different search term" : "Create your first component to get started"}
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Component
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredComponents.map((component) => (
                  <ComponentCard
                    key={component.id}
                    component={component}
                    onClick={() => setSelectedComponent(component)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details">
            {selectedComponent && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedComponent.name}</CardTitle>
                      <CardDescription>{selectedComponent.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ComponentPreview component={selectedComponent} />
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Properties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Component Type</h4>
                        <p>{selectedComponent.type}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Data Binding</h4>
                        <p>{selectedComponent.objectBinding}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Created</h4>
                        <p>{new Date(selectedComponent.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                        <p>{new Date(selectedComponent.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="pt-4">
                        <Button className="w-full" variant="outline">Edit Component</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateComponentDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
        objects={objects}
      />
    </AppLayout>
  );
};

export default ComponentLibrary;
