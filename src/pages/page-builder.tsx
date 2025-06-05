import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Save, 
  Settings,
  Download,
  Upload,
  Trash2
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { CustomObject } from "@/types/object-manager";
import GrapesEditorPro from "@/components/page-builder/enhanced/GrapesEditorPro";

const PageBuilderPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("new-page");
  const [pageTitle, setPageTitle] = useState<string>("New Page");
  const [pageHtml, setPageHtml] = useState<string>("");
  const [pageCss, setPageCss] = useState<string>("");
  const [pageComponents, setPageComponents] = useState<any>(null);
  const { currentOrg } = useAppSelector(state => state.org);

  const { data: objects = [], isLoading } = useQuery({
    queryKey: ["customObjects", currentOrg?.id],
    queryFn: async () => {
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
    toast.success("Page saved successfully");
  };
  
  const handleEditorSave = (html: string, css: string, components: any) => {
    setPageHtml(html);
    setPageCss(css);
    setPageComponents(components);
    console.log('Saved HTML:', html);
    console.log('Saved CSS:', css);
    console.log('Saved Components:', components);
  };
  
  const exportPageData = () => {
    const pageData = {
      pageTitle,
      html: pageHtml,
      css: pageCss,
      components: pageComponents,
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
        if (importedData.pageTitle) {
          setPageTitle(importedData.pageTitle);
          setPageHtml(importedData.html || '');
          setPageCss(importedData.css || '');
          setPageComponents(importedData.components || null);
          toast.success("Page imported successfully");
        } else {
          toast.error("Invalid page data format");
        }
      } catch (error) {
        toast.error("Failed to parse imported file");
      }
    };
    reader.readAsText(file);
    
    e.target.value = '';
  };
  
  const clearPage = () => {
    if (window.confirm("Are you sure you want to clear all elements from this page?")) {
      setPageHtml('');
      setPageCss('');
      setPageComponents(null);
      toast.info("Page cleared");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Enhanced Page Builder</h1>
          <p className="text-muted-foreground">
            Create beautiful pages with our professional GrapesJS-powered editor
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="h-[600px]">
          <GrapesEditorPro 
            onSave={handleEditorSave} 
            initialHtml={pageHtml}
            initialCss={pageCss}
            initialComponents={pageComponents}
            customComponents={[]} // Will be populated from component library
          />
        </div>
      </Card>
    </div>
  );
};

export default PageBuilderPage;