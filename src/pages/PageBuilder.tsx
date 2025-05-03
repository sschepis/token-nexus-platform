
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import AppLayout from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Save, 
  Eye, 
  Settings,
  Download,
  Upload,
  Trash2,
  Layout
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
import GrapesEditor from "@/components/page-builder/GrapesEditor";
import ComponentToolbox from "@/components/page-builder/ComponentToolbox";

const PageBuilder: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("new-page");
  const [pageTitle, setPageTitle] = useState<string>("New Page");
  const [editorMode, setEditorMode] = useState<"visual" | "classic">("classic");
  const [pageHtml, setPageHtml] = useState<string>("");
  const [pageCss, setPageCss] = useState<string>("");
  const { currentOrg } = useAppSelector(state => state.org);

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

  const handleSave = () => {
    // In a real app, this would save to your database
    toast.success("Page saved successfully");
  };
  
  const handleEditorSave = (html: string, css: string) => {
    setPageHtml(html);
    setPageCss(css);
    console.log('Saved HTML:', html);
    console.log('Saved CSS:', css);
  };
  
  const exportPageData = () => {
    const pageData = {
      pageTitle,
      html: pageHtml,
      css: pageCss,
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
        if (importedData.pageTitle && importedData.html) {
          setPageTitle(importedData.pageTitle);
          setPageHtml(importedData.html);
          setPageCss(importedData.css || '');
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
      setPageHtml('');
      setPageCss('');
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
              Create beautiful pages with our visual editor
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={editorMode === "visual" ? "default" : "outline"}
              onClick={() => setEditorMode("visual")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Visual Editor
            </Button>
            
            <Button 
              variant={editorMode === "classic" ? "default" : "outline"}
              onClick={() => setEditorMode("classic")}
            >
              <Layout className="mr-2 h-4 w-4" />
              Classic Editor
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
            
            <Button onClick={handleSave}>
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

        <Card className="min-h-[600px]">
          <div className="h-full">
            {editorMode === "visual" ? (
              <div className="h-[600px]">
                <GrapesEditor 
                  onSave={handleEditorSave} 
                  initialHtml={pageHtml}
                  initialCss={pageCss}
                />
              </div>
            ) : (
              <Tabs defaultValue="canvas" className="h-[600px]">
                <div className="border-b">
                  <TabsList className="w-full justify-start">
                    <TabsTrigger value="canvas">Canvas</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="objects">Objects</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="canvas" className="h-full mt-0 border-none p-4">
                  <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                    <div className="max-w-md">
                      <h3 className="text-lg font-medium mb-2">Classic Editor</h3>
                      <p className="mb-4">
                        Use our traditional drag and drop interface to build your page.
                        Switch to the Visual Editor for a more advanced experience.
                      </p>
                      <Button onClick={() => setEditorMode("visual")}>
                        <Eye className="mr-2 h-4 w-4" />
                        Switch to Visual Editor
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="components" className="h-full mt-0 border-none p-4">
                  <ComponentToolbox 
                    customObjects={[]} 
                    isLoading={false} 
                    onDragStart={() => {}}
                  />
                </TabsContent>
                
                <TabsContent value="objects" className="h-full mt-0 border-none p-4">
                  <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                    <div className="max-w-md">
                      <h3 className="text-lg font-medium mb-2">Custom Objects</h3>
                      <p>
                        Manage your custom objects and their fields to use them in your pages.
                        Go to the Object Manager section to create and edit objects.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PageBuilder;
