import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Sparkles, 
  Lightbulb, 
  Zap, 
  Target, 
  Palette, 
  Layout, 
  Database,
  Send,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePageBuilderStore } from '@/store/pageBuilderStore';
import { apiService } from '@/services/api';
import { toast } from '@/components/ui/sonner';

interface AIAssistantPanelProps {
  isVisible: boolean;
  onSuggestionApply?: (suggestion: any) => void;
  onOptimizationApply?: (optimization: any) => void;
  className?: string;
}

const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isVisible,
  onSuggestionApply,
  onOptimizationApply,
  className
}) => {
  const [userInput, setUserInput] = useState('');
  const [copiedSuggestion, setCopiedSuggestion] = useState<string | null>(null);

  const {
    aiAssistant: {
      isActive,
      isLoading,
      suggestions,
      layoutOptimizations,
      bindingSuggestions,
      contentSuggestions
    },
    setAILoading,
    setComponentSuggestions,
    setLayoutOptimizations,
    setBindingSuggestions,
    setContentSuggestions,
    addAIInteraction
  } = usePageBuilderStore();

  // Handle user input submission
  const handleSubmitQuery = useCallback(async () => {
    if (!userInput.trim()) return;

    setAILoading(true);
    
    try {
      // For now, we'll simulate AI responses based on the input
      const query = userInput.toLowerCase();
      
      if (query.includes('component') || query.includes('add')) {
        const response = await apiService.suggestComponents({
          currentElements: [],
          pageType: 'dashboard',
          userIntent: userInput
        });
        setComponentSuggestions(response.data.suggestions);
        toast.success(`Found ${response.data.suggestions.length} component suggestions`);
      } else if (query.includes('layout') || query.includes('design')) {
        const response = await apiService.optimizeLayout([]);
        setLayoutOptimizations(response.data.optimizations);
        toast.success(`Found ${response.data.optimizations.length} layout optimizations`);
      } else if (query.includes('content') || query.includes('text')) {
        const response = await apiService.generateContent({
          contentType: 'text',
          context: userInput,
          tone: 'professional'
        });
        setContentSuggestions(response.data.suggestions);
        toast.success(`Generated ${response.data.suggestions.length} content suggestions`);
      } else {
        // General query - provide mixed suggestions
        const [compResponse, layoutResponse] = await Promise.all([
          apiService.suggestComponents({
            currentElements: [],
            pageType: 'dashboard',
            userIntent: userInput
          }),
          apiService.optimizeLayout([])
        ]);
        
        setComponentSuggestions(compResponse.data.suggestions);
        setLayoutOptimizations(layoutResponse.data.optimizations);
        toast.success('Generated comprehensive suggestions');
      }

      // Add to interaction history
      addAIInteraction({
        id: Date.now().toString(),
        type: 'query',
        content: userInput,
        timestamp: new Date(),
        response: 'Generated suggestions based on your request'
      });

      setUserInput('');
    } catch (error: any) {
      console.error('AI query failed:', error);
      toast.error('Failed to process AI query');
    } finally {
      setAILoading(false);
    }
  }, [userInput, setAILoading, setComponentSuggestions, setLayoutOptimizations, setContentSuggestions, addAIInteraction]);

  // Handle suggestion application
  const handleApplySuggestion = useCallback((suggestion: any) => {
    if (onSuggestionApply) {
      onSuggestionApply(suggestion);
    }
    toast.success('Applied suggestion to page');
  }, [onSuggestionApply]);

  // Handle optimization application
  const handleApplyOptimization = useCallback((optimization: any) => {
    if (onOptimizationApply) {
      onOptimizationApply(optimization);
    }
    toast.success('Applied optimization to page');
  }, [onOptimizationApply]);

  // Handle suggestion feedback
  const handleSuggestionFeedback = useCallback((suggestionId: string, isPositive: boolean) => {
    // In a real implementation, this would send feedback to the AI service
    toast.success(isPositive ? 'Thanks for the positive feedback!' : 'Thanks for the feedback, we\'ll improve!');
  }, []);

  // Handle copy suggestion
  const handleCopySuggestion = useCallback(async (suggestion: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(suggestion, null, 2));
      setCopiedSuggestion(suggestion.id);
      setTimeout(() => setCopiedSuggestion(null), 2000);
      toast.success('Suggestion copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy suggestion');
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className={cn("w-80 bg-card border-l flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Design Assistant</h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-auto"></div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Get intelligent suggestions for components, layouts, and content
        </p>
      </div>

      {/* Query Input */}
      <div className="p-4 border-b">
        <div className="space-y-3">
          <Textarea
            placeholder="Ask me anything about your design... (e.g., 'Add a hero section', 'Improve the layout', 'Generate content for a product page')"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmitQuery();
              }
            }}
          />
          <Button 
            onClick={handleSubmitQuery} 
            disabled={!userInput.trim() || isLoading}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {isLoading ? 'Processing...' : 'Ask AI'}
          </Button>
        </div>
      </div>

      {/* Suggestions Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Component Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <h4 className="font-medium">Component Suggestions</h4>
                <Badge variant="secondary">{suggestions.length}</Badge>
              </div>
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{suggestion.component.name}</h5>
                        <p className="text-xs text-muted-foreground mt-1">
                          {suggestion.reason}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApplySuggestion(suggestion)}
                        className="h-7 text-xs"
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopySuggestion(suggestion)}
                        className="h-7 text-xs"
                      >
                        {copiedSuggestion === suggestion.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSuggestionFeedback(suggestion.id, true)}
                        className="h-7 text-xs"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSuggestionFeedback(suggestion.id, false)}
                        className="h-7 text-xs"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Layout Optimizations */}
          {layoutOptimizations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layout className="h-4 w-4 text-green-500" />
                <h4 className="font-medium">Layout Optimizations</h4>
                <Badge variant="secondary">{layoutOptimizations.length}</Badge>
              </div>
              <div className="space-y-2">
                {layoutOptimizations.map((optimization) => (
                  <Card key={optimization.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{optimization.type}</h5>
                        <p className="text-xs text-muted-foreground mt-1">
                          {optimization.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {optimization.impact}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApplyOptimization(optimization)}
                        className="h-7 text-xs"
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopySuggestion(optimization)}
                        className="h-7 text-xs"
                      >
                        {copiedSuggestion === optimization.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Content Suggestions */}
          {contentSuggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-purple-500" />
                <h4 className="font-medium">Content Suggestions</h4>
                <Badge variant="secondary">{contentSuggestions.length}</Badge>
              </div>
              <div className="space-y-2">
                {contentSuggestions.map((suggestion) => (
                  <Card key={suggestion.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{suggestion.type}</h5>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {suggestion.content}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopySuggestion(suggestion)}
                        className="h-7 text-xs"
                      >
                        {copiedSuggestion === suggestion.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <h4 className="font-medium">Quick Actions</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserInput('Add a hero section with call-to-action')}
                className="h-auto p-2 text-xs"
              >
                <Target className="h-3 w-3 mb-1" />
                Hero Section
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserInput('Improve the color scheme and typography')}
                className="h-auto p-2 text-xs"
              >
                <Palette className="h-3 w-3 mb-1" />
                Color Scheme
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserInput('Optimize layout for mobile devices')}
                className="h-auto p-2 text-xs"
              >
                <Layout className="h-3 w-3 mb-1" />
                Mobile Layout
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUserInput('Generate content for a landing page')}
                className="h-auto p-2 text-xs"
              >
                <Database className="h-3 w-3 mb-1" />
                Content
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {suggestions.length === 0 && layoutOptimizations.length === 0 && contentSuggestions.length === 0 && (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium mb-2">Ready to help!</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Ask me anything about your design or try one of the quick actions above.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AIAssistantPanel;