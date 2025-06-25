import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { usePageController } from "@/hooks/usePageController";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Loader2,
  Zap,
  AlertCircle
} from "lucide-react";
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
import GrapesEditor from "@/components/page-builder/GrapesEditor";
import ComponentToolbox from "@/components/page-builder/ComponentToolbox";

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
  const { currentOrg } = useAppSelector(state => state.org);
  const { orgId: authOrgId } = useAppSelector(state => state.auth);
  const { toast } = useToast();
  
  const effectiveOrgId = currentOrg?.id || authOrgId;

  // Use standardized page controller
  const pageController = usePageController({
    pageId: 'page-builder',
    pageName: 'Page Builder',
    description: 'Create and manage pages with visual editor and component toolbox',
    category: 'content-management',
    permissions: ['pages:read'],
    tags: ['pages', 'editor', 'visual', 'content']
  });

  // Permission checks - System admins (isAdmin=true) automatically get all permissions via usePermission hook
  const { hasPermission, checkAnyPermission, user, isAuthenticated } = usePermission();
  
  console.log('[PageBuilder] Permission debug:', {
    isAuthenticated,
    userId: user?.id,
    userIsAdmin: user?.isAdmin,
    user: user
  });
  
  const canRead = checkAnyPermission(['pages:read', 'pages:write', 'pagebuilder:read', 'pagebuilder:write', 'pagebuilder:manage']);
  const canWrite = checkAnyPermission(['pages:write', 'pagebuilder:write', 'pagebuilder:manage']);
  const canManage = checkAnyPermission(['pagebuilder:manage']);
  
  console.log('[PageBuilder] Permission results:', { canRead, canWrite, canManage });

  // Local state management
  const [cloudPages, setCloudPages] = useState<CloudPage[]>([]);
  const [availableComponents, setAvailableComponents] = useState<any[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPages, setLoadingPages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controllerError, setControllerError] = useState<string | null>(null);

  // Load pages function
  const loadPages = async () => {
    if (!pageController.isRegistered || !canRead) {
      setControllerError("Cannot load pages: Controller not available or insufficient permissions");
      return;
    }
    
    setLoadingPages(true);
    setError(null);
    setControllerError(null);
    
    try {
      const result = await pageController.executeAction('fetchPages', { 
        includeInactive: false
      });
      
      if (result.success && result.data) {
        const pagesData = result.data as { pages: CloudPage[] };
        setCloudPages(pagesData.pages || []);
      } else {
        setControllerError(`Failed to load pages: ${result.error}`);
        console.error('Load pages error:', result.error);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      setControllerError("Failed to load pages");
    } finally {
      setLoadingPages(false);
    }
  };

  // Load pages on component mount
  useEffect(() => {
    if (pageController.isRegistered) {
      loadPages();
      setIsLoading(false);
    }
  }, [pageController.isRegistered]);

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

  const handleSave = async () => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to save pages",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = currentPageId 
        ? await pageController.executeAction('updatePage', {
            pageId: currentPageId,
            name: pageTitle,
            title: pageTitle,
            layout: { html: pageHtml, css: pageCss, js: pageJs },
            isActive: true
          })
        : await pageController.executeAction('createPage', {
            name: pageTitle,
            path: pageSlug,
            title: pageTitle,
            layout: { html: pageHtml, css: pageCss, js: pageJs },
            components: [],
            category: 'custom'
          });

      if (result.success && result.data) {
        const pageData = result.data as { page: any };
        setCurrentPageId(pageData.page.objectId || pageData.page.id);
        toast({
          title: "Success",
          description: result.message || "Page saved successfully"
        });
        loadPages(); // Refresh the pages list
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to save page",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save page",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to publish pages",
        variant: "destructive",
      });
      return;
    }

    // For now, publishing is the same as saving with active status
    await handleSave();
  };
  
  const handleEditorSave = (html: string, css: string) => {
    setPageHtml(html);
    setPageCss(css);
    console.log('Saved HTML:', html);
    console.log('Saved CSS:', css);
  };

  const handleLoadFromCloud = async (pageId: string) => {
    try {
      const result = await pageController.executeAction('previewPage', { pageId });
      
      if (result.success && result.data) {
        const pageData = result.data as { page: any };
        const page = pageData.page;
        
        setCurrentPageId(page.objectId || page.id);
        setPageTitle(page.title || page.name);
        setPageSlug(page.path || generateSlug(page.title || page.name));
        
        if (page.layout) {
          setPageHtml(page.layout.html || '');
          setPageCss(page.layout.css || '');
          setPageJs(page.layout.js || '');
        }
        
        toast({
          title: "Success",
          description: "Page loaded successfully"
        });
        setShowCloudDialog(false);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load page",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load page",
        variant: "destructive",
      });
    }
  };

  const handleGenerateToken = () => {
    if (currentPageId) {
      // This would need a controller action for token generation
      setGeneratedToken("sample-token-" + Date.now());
      setShowTokenDialog(true);
    } else {
      toast({
        title: "Error",
        description: "Please save the page first",
        variant: "destructive",
      });
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
    
    toast({
      title: "Success",
      description: "Page exported successfully"
    });
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
          toast({
            title: "Success",
            description: "Page imported successfully"
          });
        } else {
          toast({
            title: "Error",
            description: "Invalid page data format",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to parse imported file",
          variant: "destructive",
        });
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
      toast({
        title: "Info",
        description: "Page cleared"
      });
    }
  };

  // Permission check - show error if user doesn't have read access
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Layout className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Page Builder</h1>
                <p className="text-muted-foreground mt-1">
                  Create beautiful pages with our visual editor
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the page builder. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3">
              <Layout className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Page Builder</h1>
                <p className="text-muted-foreground mt-1">
                  Create beautiful pages with our visual editor
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pageController.isRegistered && (
              <div className="flex items-center gap-2 mr-2">
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {pageController.getAvailableActions().length} AI actions
                </Badge>
              </div>
            )}
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
                disabled={isSaving || !canWrite}
              >
                {isSaving ? (
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
                disabled={isSaving || !canWrite}
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
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
              You have read-only access to the page builder. Contact your administrator for write permissions.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-4 mb-4">
          <Input
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            className="max-w-xs"
            placeholder="Page Title"
            disabled={!canWrite}
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
                Select a page to load into the editor
              </DialogDescription>
            </DialogHeader>
            
            {loadingPages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading pages...</span>
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {cloudPages.map((page: CloudPage) => (
                  <Card
                    key={page.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleLoadFromCloud(page.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{page.title}</h4>
                        <p className="text-sm text-muted-foreground">/{page.slug}</p>
                      </div>
                      <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                        {page.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
                {cloudPages.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pages found. Create your first page to get started.
                  </div>
                )}
              </div>
            )}
            
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
                Use this token to access your page externally
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md font-mono text-sm break-all">
                {generatedToken}
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(generatedToken);
                  toast({
                    title: "Success",
                    description: "Token copied to clipboard"
                  });
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
  );
};

export default PageBuilder;
