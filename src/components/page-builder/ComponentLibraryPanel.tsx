import React, { useState, useCallback, useEffect } from 'react';
import { Search, Plus, Filter, Grid, List, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CustomComponent } from '@/types/component-library';
import { ComponentCategory, ComponentFilter } from '@/store/pageBuilderStore';
import { usePageBuilderStore } from '@/store/pageBuilderStore';
import { apiService } from '@/services/api';
import { toast } from '@/components/ui/sonner';

interface ComponentLibraryPanelProps {
  isVisible: boolean;
  onComponentSelect: (component: CustomComponent) => void;
  onComponentDrag: (component: CustomComponent) => void;
  className?: string;
}

interface ComponentCardProps {
  component: CustomComponent;
  onClick: () => void;
  onDragStart: () => void;
  isSelected: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  component,
  onClick,
  onDragStart,
  isSelected
}) => {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart();
  }, [component, onDragStart]);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
    >
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate">
            {component.name}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {component.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="aspect-video bg-muted rounded-md mb-2 flex items-center justify-center">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {component.description}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{component.objectBinding}</span>
          <span>{component.elements.length} elements</span>
        </div>
      </CardContent>
    </Card>
  );
};

const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({
  isVisible,
  onComponentSelect,
  onComponentDrag,
  className = ''
}) => {
  // Store state
  const {
    componentLibrary: {
      components,
      categories,
      selectedComponent,
      searchQuery,
      filters,
      isLoading,
      error
    },
    setComponents,
    selectComponent,
    setComponentSearchQuery,
    setComponentFilters,
    setComponentLibraryLoading,
    setComponentLibraryError
  } = usePageBuilderStore();

  // Local state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load components on mount
  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = useCallback(async () => {
    setComponentLibraryLoading(true);
    setComponentLibraryError(null);
    
    try {
      const response = await apiService.getComponents({
        category: selectedCategory || undefined,
        searchTerm: searchQuery || undefined,
        ...filters
      });
      
      setComponents(response.data.components || []);
    } catch (error: any) {
      console.error('Failed to load components:', error);
      setComponentLibraryError(error.message || 'Failed to load components');
      toast.error('Failed to load components');
    } finally {
      setComponentLibraryLoading(false);
    }
  }, [selectedCategory, searchQuery, filters, setComponents, setComponentLibraryLoading, setComponentLibraryError]);

  // Reload components when filters change
  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const handleComponentClick = useCallback((component: CustomComponent) => {
    selectComponent(component);
    onComponentSelect(component);
  }, [selectComponent, onComponentSelect]);

  const handleComponentDrag = useCallback((component: CustomComponent) => {
    onComponentDrag(component);
  }, [onComponentDrag]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setComponentSearchQuery(e.target.value);
  }, [setComponentSearchQuery]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setComponentFilters({ ...filters, category: categoryId || undefined });
  }, [filters, setComponentFilters]);

  const filteredComponents = components.filter(component => {
    if (selectedCategory && component.type !== selectedCategory) {
      return false;
    }
    return true;
  });

  // Early returns for loading/error states
  if (!isVisible) return null;

  return (
    <div className={`w-80 border-r bg-card flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Component Library</h3>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Filter className="h-4 w-4 mr-2" />
                {selectedCategory ? 
                  categories.find(c => c.id === selectedCategory)?.name || 'Category' 
                  : 'All Categories'
                }
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleCategorySelect(null)}>
                All Categories
              </DropdownMenuItem>
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  {category.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive mb-2">Failed to load components</p>
            <Button variant="outline" size="sm" onClick={loadComponents}>
              Retry
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="components" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="flex-1 mt-2">
              <ScrollArea className="h-full px-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-32 bg-muted rounded-md animate-pulse" />
                    ))}
                  </div>
                ) : filteredComponents.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-sm font-medium mb-2">No components found</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      {searchQuery ? 'Try a different search term' : 'Create your first component to get started'}
                    </p>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Component
                    </Button>
                  </div>
                ) : (
                  <div className={`space-y-3 pb-4 ${viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : 'space-y-2'}`}>
                    {filteredComponents.map((component) => (
                      <ComponentCard
                        key={component.id}
                        component={component}
                        onClick={() => handleComponentClick(component)}
                        onDragStart={() => handleComponentDrag(component)}
                        isSelected={selectedComponent?.id === component.id}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="templates" className="flex-1 mt-2">
              <ScrollArea className="h-full px-4">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-sm font-medium mb-2">Templates coming soon</h4>
                  <p className="text-xs text-muted-foreground">
                    Pre-built page templates will be available here
                  </p>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ComponentLibraryPanel;