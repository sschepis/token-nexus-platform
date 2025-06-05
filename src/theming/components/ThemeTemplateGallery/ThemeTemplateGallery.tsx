import React, { useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Palette, 
  Eye, 
  Download, 
  Star, 
  Filter,
  Grid3X3,
  List,
  Sparkles
} from 'lucide-react';
import { ThemeTemplate, OrganizationTheme } from '../../types/theme.types';
import { 
  selectThemeTemplates, 
  selectThemeLoading,
  applyThemeTemplate,
  setPreviewTheme 
} from '@/store/slices/themeSlice';
import { useTheme } from '../../providers/ThemeContext';
import type { AppDispatch } from '@/store/store';

interface ThemeTemplateGalleryProps {
  organizationId: string;
  onTemplateSelect?: (template: ThemeTemplate) => void;
  onClose?: () => void;
  className?: string;
}

interface TemplateCardProps {
  template: ThemeTemplate;
  onPreview: (template: ThemeTemplate) => void;
  onApply: (template: ThemeTemplate) => void;
  isLoading?: boolean;
  viewMode: 'grid' | 'list';
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onPreview,
  onApply,
  isLoading = false,
  viewMode
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getColorPreview = () => {
    const theme = template.theme;
    return [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.accent,
      theme.colors.success,
      theme.colors.warning
    ];
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Color Preview */}
              <div className="flex gap-1">
                {getColorPreview().map((color, index) => (
                  <div
                    key={index}
                    className="w-4 h-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              {/* Template Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{template.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {template.category}
                  </Badge>
                  {template.popularity > 80 && (
                    <Badge variant="default" className="text-xs flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <div className="flex gap-1 mt-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPreview(template)}
                disabled={isLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={() => onApply(template)}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {template.name}
              {template.popularity > 80 && (
                <Badge variant="default" className="text-xs flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  Popular
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {template.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Color Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Color Palette</p>
          <div className="flex gap-2">
            {getColorPreview().map((color, index) => (
              <div
                key={index}
                className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Typography Preview */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Typography</p>
          <div 
            className="text-sm"
            style={{ 
              fontFamily: template.theme.typography.fontFamily,
              color: template.theme.colors.text.primary 
            }}
          >
            <div className="font-semibold">Heading Sample</div>
            <div className="text-xs" style={{ color: template.theme.colors.text.secondary }}>
              Body text sample
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 4}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className={`flex gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onPreview(template)}
            disabled={isLoading}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onApply(template)}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const ThemeTemplateGallery: React.FC<ThemeTemplateGalleryProps> = ({
  organizationId,
  onTemplateSelect,
  onClose,
  className = ''
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector(selectThemeTemplates);
  const isLoading = useSelector(selectThemeLoading);
  const { previewTheme } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get unique categories and tags
  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, [templates]);

  const allTags = useMemo(() => {
    const tags = new Set(templates.flatMap(t => t.tags));
    return Array.from(tags).sort();
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const hasSelectedTag = selectedTags.some(tag => template.tags.includes(tag));
        if (!hasSelectedTag) return false;
      }

      return true;
    });
  }, [templates, searchQuery, selectedCategory, selectedTags]);

  // Sort templates by popularity
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => b.popularity - a.popularity);
  }, [filteredTemplates]);

  const handlePreview = useCallback(async (template: ThemeTemplate) => {
    try {
      // Create a complete theme object from template
      const completeTheme: OrganizationTheme = {
        ...template.theme,
        id: `preview-${template.id}-${Date.now()}`,
        organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await previewTheme(completeTheme);
      onTemplateSelect?.(template);
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  }, [previewTheme, onTemplateSelect]);

  const handleApply = useCallback(async (template: ThemeTemplate) => {
    try {
      await dispatch(applyThemeTemplate({ 
        templateId: template.id, 
        organizationId 
      })).unwrap();
      onTemplateSelect?.(template);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  }, [dispatch, organizationId, onTemplateSelect]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  return (
    <div className={`theme-template-gallery ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            Theme Templates
          </h2>
          <p className="text-muted-foreground">
            Choose from professionally designed themes to get started quickly
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and View Mode */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList>
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category} className="capitalize">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Tag Filters */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {sortedTemplates.length} template{sortedTemplates.length !== 1 ? 's' : ''} found
        </p>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTags([])}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Templates Grid/List */}
      {sortedTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Palette className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No templates found matching your criteria</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {sortedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={handlePreview}
              onApply={handleApply}
              isLoading={isLoading}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ThemeTemplateGallery;