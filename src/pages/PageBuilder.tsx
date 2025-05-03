
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { 
  LayoutPanelLeft, 
  Save, 
  Eye, 
  Plus, 
  Settings,
  Move,
  Copy,
  Trash2,
  Download,
  Upload
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CustomObject } from "@/types/object-manager";
import PageCanvas from "@/components/page-builder/PageCanvas";
import ComponentToolbox from "@/components/page-builder/ComponentToolbox";
import PropertiesPanel from "@/components/page-builder/PropertiesPanel";
import { PageElement } from "@/types/page-builder";

const PageBuilder: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("new-page");
  const [pageTitle, setPageTitle] = useState<string>("New Page");
  const [selectedElement, setSelectedElement] = useState<PageElement | null>(null);
  const [pageElements, setPageElements] = useState<PageElement[]>([]);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const { currentOrg } = useAppSelector(state => state.org);
  const [draggedElementType, setDraggedElementType] = useState<string | null>(null);
  const [draggedObjectReference, setDraggedObjectReference] = useState<string | undefined>(undefined);

  // Get custom objects from database
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ["customObjects", currentOrg?.id],
    queryFn: async () => {
      // Mock data for now - in production, this would fetch from your database
      return [
        {
          id: "obj-123",
          apiName: "Customer__c",
          label: "Customer",
          description: "Customer information",
          fields: [
            { id: "field-1", apiName: "Name", label: "Name", type: "text", required: true },
            { id: "field-2", apiName: "Email__c", label: "Email", type: "email", required: true },
            { id: "field-3", apiName: "Phone__c", label: "Phone", type: "phone", required: false }
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
            { id: "field-6", apiName: "Customer__c", label: "Customer", type: "lookup", required: true, referenceTo: "Customer__c" },
            { id: "field-7", apiName: "StartDate__c", label: "Start Date", type: "date", required: true }
          ],
          createdAt: "2023-04-20T09:15:00Z",
          updatedAt: "2023-06-12T11:30:00Z",
        }
      ] as CustomObject[];
    }
  });

  const handleDragStart = (elementType: string, objectReference?: string) => {
    setDraggedElementType(elementType);
    setDraggedObjectReference(objectReference);
  };

  const handleAddElement = (elementType: string, position: { x: number, y: number }, objectReference?: string) => {
    const newElement: PageElement = {
      id: `element-${Date.now()}`,
      type: elementType,
      props: { label: `New ${elementType}` },
      position,
      size: { width: 200, height: elementType === 'container' ? 300 : 40 },
      children: [],
      style: {},
      objectReference
    };
    
    setPageElements([...pageElements, newElement]);
    setSelectedElement(newElement);
    toast.success(`Added ${elementType} to the page`);
  };

  const handleUpdateElement = (updatedElement: PageElement) => {
    const updatedElements = pageElements.map(el => 
      el.id === updatedElement.id ? updatedElement : el
    );
    setPageElements(updatedElements);
    setSelectedElement(updatedElement);
  };

  const handleDuplicateElement = (element: PageElement) => {
    const duplicatedElement: PageElement = {
      ...element,
      id: `element-${Date.now()}`,
      position: {
        x: element.position.x + 20,
        y: element.position.y + 20
      }
    };
    
    setPageElements([...pageElements, duplicatedElement]);
    setSelectedElement(duplicatedElement);
  };

  const handleDeleteElement = (elementId: string) => {
    const filteredElements = pageElements.filter(el => el.id !== elementId);
    setPageElements(filteredElements);
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  };

  const handleSavePage = () => {
    // In a real app, this would save to your database
    console.log("Saving page:", { title: pageTitle, elements: pageElements });
    toast.success("Page saved successfully");
  };

  const handleSelectElement = (element: PageElement | null) => {
    setSelectedElement(element);
  };

  const exportPageData = () => {
    const pageData = {
      pageTitle,
      elements: pageElements,
      createdAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(pageData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pageTitle.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Page exported successfully");
  };
  
  const importPageData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData.pageTitle && importedData.elements) {
          setPageTitle(importedData.pageTitle);
          setPageElements(importedData.elements);
          toast.success("Page imported successfully");
        } else {
          toast.error("Invalid page data format");
        }
      } catch (error) {
        toast.error("Failed to parse imported file");
      }
    };
    reader.readAsText(file);
    
    // Clear the input value so the same file can be imported again if needed
    e.target.value = '';
  };
  
  const clearPage = () => {
    if (window.confirm("Are you sure you want to clear all elements from this page?")) {
      setPageElements([]);
      setSelectedElement(null);
      toast.info("Page cleared");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Visual Page Builder</h1>
            <p className="text-muted-foreground">
              Drag components onto the canvas to build your page
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {previewMode ? "Edit" : "Preview"}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={exportPageData}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Page</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <label className="flex items-center cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Import Page</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={importPageData} 
                      className="hidden" 
                    />
                  </label>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={clearPage}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Clear Page</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={handleSavePage}>
              <Save className="mr-2 h-4 w-4" />
              Save Page
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <Input
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="max-w-xs"
            placeholder="Page Title"
          />
        </div>

        <ResizablePanelGroup
          direction="horizontal"
          className="min-h-[600px] border rounded-lg"
        >
          {/* Component Toolbox Panel */}
          <ResizablePanel defaultSize={20} minSize={15}>
            <div className="h-full p-4 border-r">
              <ComponentToolbox 
                customObjects={objects} 
                isLoading={isLoading} 
                onDragStart={handleDragStart}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Canvas Panel */}
          <ResizablePanel defaultSize={60}>
            <div className="h-full">
              <PageCanvas 
                elements={pageElements} 
                selectedElement={selectedElement}
                onSelectElement={handleSelectElement}
                onUpdateElement={handleUpdateElement}
                onDuplicateElement={handleDuplicateElement}
                onDeleteElement={handleDeleteElement}
                onAddElement={handleAddElement}
                isPreviewMode={previewMode}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Properties Panel */}
          <ResizablePanel defaultSize={20} minSize={15}>
            <div className="h-full p-4 border-l">
              <PropertiesPanel 
                element={selectedElement} 
                onUpdateElement={handleUpdateElement}
                customObjects={objects}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppLayout>
  );
};

export default PageBuilder;
