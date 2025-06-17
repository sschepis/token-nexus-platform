import React, { useState, useCallback, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { usePageBuilderStore } from '@/store/pageBuilderStore';
import { CustomComponent } from '@/types/component-library';
import { usePageController } from '@/hooks/usePageController';
import { pageBuilderPageController } from '@/controllers/PageBuilderPageController';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import GrapesEditor from '@/components/page-builder/GrapesEditor';
import PageBuilderHeader from '@/components/page-builder/layouts/PageBuilderHeader';
import PageBuilderMainContent from '@/components/page-builder/main/PageBuilderMainContent';
import PageBuilderStatusBar from '@/components/page-builder/layouts/PageBuilderStatusBar';

const PageBuilderPage: NextPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [controllerPages, setControllerPages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canRead = hasPermission('pages:read');
  const canWrite = hasPermission('pages:write');
  const canReadComponents = hasPermission('components:read');

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'page-builder',
    pageName: 'Page Builder',
    description: 'Visual page builder for creating custom application pages',
    category: 'development',
    permissions: ['pages:read', 'pages:write', 'components:read'],
    tags: ['pages', 'builder', 'visual', 'components']
  });

  // Store state and actions
  const {
    pages,
    currentPageId,
    ui: {
      currentView,
      deviceMode,
      showComponentLibrary,
      showAIAssistant,
      showLayers,
      showStyles,
      showPageList,
      isFullscreen
    },
    componentLibrary: {
      components: customComponents
    },
    aiAssistant: {
      isActive: aiAssistantActive,
      suggestions,
      layoutOptimizations
    },
    setCurrentView,
    setDeviceMode,
    toggleComponentLibrary,
    toggleAIAssistantPanel,
    toggleLayers,
    toggleStyles,
    togglePageList,
    toggleFullscreen,
    addPage,
    setCurrentPageId // Added to handle page selection from sidebar
  } = usePageBuilderStore();

  // Get current page
  const currentPage = pages.find(page => page.id === currentPageId);

  // Load pages from controller
  const loadPages = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('fetchPages', { includeInactive: true });
      
      if (result.success && result.data) {
        const pagesData = result.data as { pages: any[] };
        setControllerPages(pagesData.pages || []);
        toast({
          title: "Pages loaded",
          description: "Pages loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load pages');
        toast({
          title: "Error loading pages",
          description: result.error || 'Failed to load pages',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      setError('Failed to load pages');
      toast({
        title: "Error loading pages",
        description: 'Failed to load pages',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle page save with controller
  const handleSave = useCallback(async (html: string, css: string, components: any) => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to save pages",
        variant: "destructive",
      });
      return;
    }

    if (!pageController.isRegistered) {
      toast({
        title: "Controller not available",
        description: "Controller not available",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (currentPage) {
        // Update existing page
        const result = await pageController.executeAction('updatePage', {
          pageId: currentPage.id,
          layout: { html, css },
          components: components
        });

        if (result.success) {
          setLastSaved(new Date());
          toast({
            title: "Page saved",
            description: "Page saved successfully!",
          });
          await loadPages(); // Refresh pages
        } else {
          toast({
            title: "Error saving page",
            description: result.error || 'Failed to save page',
            variant: "destructive",
          });
        }
      } else {
        // Create new page
        const result = await pageController.executeAction('createPage', {
          name: 'New Page',
          path: `/page-${Date.now()}`,
          title: 'New Page',
          layout: { html, css },
          components: components
        });

        if (result.success) {
          setLastSaved(new Date());
          toast({
            title: "Page created",
            description: "Page created successfully!",
          });
          await loadPages(); // Refresh pages
        } else {
          toast({
            title: "Error creating page",
            description: result.error || 'Failed to create page',
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: "Error saving page",
        description: 'Failed to save page',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [pageController, currentPage, loadPages, canWrite, toast]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setError(null);
    loadPages();
  }, [loadPages]);

  // Handle component selection from library
  const handleComponentSelect = useCallback((component: CustomComponent) => {
    console.log('Component selected:', component);
    toast({
      title: "Component selected",
      description: `Selected ${component.name}`,
    });
  }, [toast]);

  // Handle component drag start from library panel
  const handleComponentDragStart = useCallback((component: CustomComponent) => {
    console.log('Drag started for component:', component.name);
    // No direct action needed here since GrapesEditor handles the drop logic
  }, []);

  // Handle component drop onto the editor
  const handleComponentDrop = useCallback((component: CustomComponent, position: { x: number; y: number }) => {
    console.log('Component dropped:', component, position);
    toast({
      title: "Component added",
      description: `Added ${component.name} to page`,
    });
  }, [toast]);

  // Handle AI suggestion application
  const handleAISuggestionApply = useCallback((suggestion: any) => {
    console.log('Applying AI suggestion:', suggestion);
    toast({
      title: "AI suggestion applied",
      description: "AI suggestion applied to page",
    });
  }, [toast]);

  // Handle layout optimization application
  const handleLayoutOptimizationApply = useCallback((optimization: any) => {
    console.log('Applying layout optimization:', optimization);
    toast({
      title: "Layout optimized",
      description: "Layout optimization applied",
    });
  }, [toast]);

  // Handle device mode changes
  const handleDeviceChange = useCallback((device: 'desktop' | 'tablet' | 'mobile') => {
    setDeviceMode(device);
    toast({
      title: "Device mode changed",
      description: `Switched to ${device} view`,
    });
  }, [setDeviceMode, toast]);

  // Handle view changes
  const handleViewChange = useCallback((view: 'design' | 'code' | 'preview') => {
    setCurrentView(view);
    toast({
      title: "View changed",
      description: `Switched to ${view} view`,
    });
  }, [setCurrentView, toast]);

  // Load pages on component mount
  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadPages();
    }
  }, [pageController.isRegistered, canRead]);

  // Create new page if none exists
  useEffect(() => {
    if (pages.length === 0) {
      addPage('New Page');
    }
  }, [pages.length]);

  // Show permission error if user can't read pages
  if (!canRead) {
    return (
      <>
        <Head>
          <title>Page Builder - Token Nexus Platform</title>
          <meta name="description" content="Visual page builder with AI assistance and component library" />
        </Head>

        <div className="h-screen flex flex-col bg-background p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Page Builder</h1>
              <p className="text-muted-foreground mt-2">
                Visual page builder with AI assistance and component library
              </p>
            </div>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access the page builder. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </>
    );
  }

  if (isFullscreen) {
    return (
      <div className="h-screen w-screen bg-background">
        <GrapesEditor
          onSave={handleSave}
          customComponents={customComponents}
          onComponentDrop={handleComponentDrop}
          onAISuggestion={handleAISuggestionApply}
          onLayoutOptimization={handleLayoutOptimizationApply}
        />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Page Builder - Token Nexus Platform</title>
        <meta name="description" content="Visual page builder with AI assistance and component library" />
      </Head>

      <div className="h-screen flex flex-col bg-background">
        {/* Display error */}
        {error && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <PageBuilderHeader
          currentPageTitle={currentPage?.title || ''}
          lastSaved={lastSaved}
          aiAssistantActive={aiAssistantActive}
          suggestionsCount={suggestions.length}
          layoutOptimizationsCount={layoutOptimizations.length}
          deviceMode={deviceMode}
          currentView={currentView}
          showPageList={showPageList}
          showComponentLibrary={showComponentLibrary}
          showAIAssistant={showAIAssistant}
          showStyles={showStyles}
          isLoading={isLoading}
          onDeviceChange={handleDeviceChange}
          onViewChange={handleViewChange}
          onTogglePageList={togglePageList}
          onToggleComponentLibrary={toggleComponentLibrary}
          onToggleAIAssistantPanel={toggleAIAssistantPanel}
          onToggleStyles={toggleStyles}
          onToggleFullscreen={toggleFullscreen}
          onSave={() => handleSave('', '', {})}
        />

        <PageBuilderMainContent
          showPageList={showPageList}
          showComponentLibrary={showComponentLibrary && canReadComponents}
          showAIAssistant={showAIAssistant}
          customComponents={canReadComponents ? customComponents : []}
          onComponentSelect={handleComponentSelect}
          onComponentDragStart={handleComponentDragStart}
          onComponentDrop={handleComponentDrop}
          onAISuggestionApply={handleAISuggestionApply}
          onLayoutOptimizationApply={handleLayoutOptimizationApply}
          onSave={handleSave}
        />

        <PageBuilderStatusBar
          deviceMode={deviceMode}
          currentView={currentView}
          customComponents={canReadComponents ? customComponents : []}
          aiAssistantActive={aiAssistantActive}
          suggestionsCount={suggestions.length}
          layoutOptimizationsCount={layoutOptimizations.length}
          lastSaved={lastSaved}
        />
      </div>
    </>
  );
};

export default PageBuilderPage;