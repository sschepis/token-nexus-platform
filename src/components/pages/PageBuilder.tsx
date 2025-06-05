
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/store/hooks";
// import AppLayout from "@/components/layout/AppLayout"; // Removed AppLayout import
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
  Layout,
  Cloud,
  CloudUpload,
  Key,
  FolderOpen,
  Plus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomObject } from "@/types/object-manager";
import GrapesEditor from "@/components/page-builder/GrapesEditor";
import ComponentToolbox from "@/components/page-builder/ComponentToolbox";
import Parse from 'parse';

interface CloudPage {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  lastModifiedAt: string;
  organization?: {
    id: string;
    name: string;
  };
}

const PageBuilder: React.FC = () => {
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState<string>("New Page");
  const [pageSlug, setPageSlug] = useState<string>("new-page");
  const [editorMode, setEditorMode] = useState<"visual" | "classic">("classic");
  const [pageHtml, setPageHtml] = useState<string>("");
  const [pageCss, setPageCss] = useState<string>("");
  const [pageJs, setPageJs] = useState<string>("");
  const [showCloudDialog, setShowCloudDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string>("");
  const { currentOrg } = useAppSelector(state => state.org);
  const queryClient = useQueryClient();

  // Fetch cloud pages
  const { data: cloudPages = [], isLoading: loadingPages } = useQuery({
    queryKey: ["cloudPages", currentOrg?.id],
    queryFn: async () => {
      try {
        const result = await Parse.Cloud.run('listPages', {
          organizationId: currentOrg?.id,
          limit: 100
        });
        return result.success ? result.pages : [];
      } catch (error) {
        console.error('Error fetching pages:', error);
        return [];
      }
    }
  });

  // Fetch available components
  const { data: availableComponents = [] } = useQuery({
    queryKey: ["pageComponents", currentOrg?.id],
    queryFn: async () => {
      try {
        const result = await Parse.Cloud.run('getAvailableComponents', {
          organizationId: currentOrg?.id
        });
        return result.success ? result.components : [];
      } catch (error) {
        console.error('Error fetching components:', error);
        return [];
      }
    }
  });

  // Save to cloud mutation
  const saveToCloudMutation = useMutation({
    mutationFn: async (data: { pageId?: string; title: string; slug: string; html: string; css: string; js: string; status?: string }) => {
      const result = await Parse.Cloud.run('savePageToCloud', {
        ...data,
        organizationId: currentOrg?.id
      });
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
        setCurrentPageId(result.pageId);
        queryClient.invalidateQueries({ queryKey: ["cloudPages"] });
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save page');
    }
  });

  // Load from cloud mutation
  const loadFromCloudMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const result = await Parse.Cloud.run('getPageFromCloud', { pageId });
      return result;
    },
    onSuccess: (result) => {
      if (result.success && result.page) {
        setCurrentPageId(result.page.id);
        setPageTitle(result.page.title);
        setPageSlug(result.page.slug);
        setPageHtml(result.page.html || '');
        setPageCss(result.page.css || '');
        setPageJs(result.page.js || '');
        toast.success('Page loaded successfully');
        setShowCloudDialog(false);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to load page');
    }
  });

  // Generate token mutation
  const generateTokenMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const result = await Parse.Cloud.run('generatePageAccessToken', {
        pageId,
        expiresIn: '24h'
      });
      return result;
    },
    onSuccess: (result) => {
      if (result.success && result.token) {
        setGeneratedToken(result.token);
        setShowTokenDialog(true);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate token');
    }
  });

  // Get custom objects from database
  const { data: objects = [], isLoading } = useQuery({
    queryKey: ["customObjects", currentOrg?.id],
    queryFn: async () => {
      try {
        const result = await Parse.Cloud.run('getAvailableObjects', {
          organizationId: currentOrg?.id
        });
        return result.success ? result.objects : [];
      } catch (error) {
        console.error('Error fetching custom objects:', error);
        return [];
      }
    }
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    if (pageTitle && !currentPageId) {
      setPageSlug(generateSlug(pageTitle));
    }
  }, [pageTitle, currentPageId]);

  const handleSave = () => {
    saveToCloudMutation.mutate({
      pageId: currentPageId || undefined,
      title: pageTitle,
      slug: pageSlug,
      html: pageHtml,
      css: pageCss,
      js: pageJs,
      status: 'draft'
    });
  };

  const handlePublish = () => {
    saveToCloudMutation.mutate({
      pageId: currentPageId || undefined,
      title: pageTitle,
      slug: pageSlug,
      html: pageHtml,
      css: pageCss,
      js: pageJs,
      status: 'published'
    });
  };
  
  const handleEditorSave = (html: string, css: string) => {
    setPageHtml(html);
    setPageCss(css);
    console.log('Saved HTML:', html);
    console.log('Saved CSS:', css);
  };

  const handleGenerateToken = () => {
    if (currentPageId) {
      generateTokenMutation.mutate(currentPageId);
    } else {
      toast.error('Please save the page first');
    }
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
    // <AppLayout> // Removed AppLayout wrapper; _app.tsx handles it.
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
                <DropdownMenuItem onClick={() => setShowCloudDialog(true)}>
                  <Cloud className="mr-2 h-4 w-4" />
                  <span>Load from Cloud</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleGenerateToken}>
                  <Key className="mr-2 h-4 w-4" />
                  <span>Generate Access Token</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={exportPageData}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export to File</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <label className="flex items-center cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Import from File</span>
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
            
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveToCloudMutation.isPending}
              >
                {saveToCloudMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
              
              <Button
                onClick={handlePublish}
                variant="default"
                disabled={saveToCloudMutation.isPending}
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </div>
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

        {/* Cloud Pages Dialog */}
        <Dialog open={showCloudDialog} onOpenChange={setShowCloudDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Load Page from Cloud</DialogTitle>
              <DialogDescription>
                Select a page to load from your cloud storage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {loadingPages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {cloudPages.map((page: CloudPage) => (
                    <Card
                      key={page.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => loadFromCloudMutation.mutate(page.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{page.title}</h4>
                          <p className="text-sm text-muted-foreground">{page.slug}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(page.lastModifiedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {cloudPages.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No pages found in cloud storage
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloudDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Token Dialog */}
        <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Page Access Token</DialogTitle>
              <DialogDescription>
                Use this token to access the page via API or embed it in other applications
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
                {generatedToken}
              </div>
              <div className="text-sm text-muted-foreground">
                This token expires in 24 hours. Generate a new token when needed.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedToken);
                  toast.success('Token copied to clipboard');
                }}
              >
                Copy Token
              </Button>
              <Button onClick={() => setShowTokenDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    // </AppLayout>
  );
};

export default PageBuilder;
