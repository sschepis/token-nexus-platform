// src/components/ai-assistant/EnhancedAIChatInterface.tsx
import React, { useState, useCallback, FormEvent, useRef, useEffect, useMemo } from 'react';
import { AssistantQueryResponse } from '../../ai-assistant/types';
import { aiAssistantApi } from '@/services/api/aiAssistant';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppSelector } from '@/store/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  AlertCircle, 
  Sparkles,
  Zap,
  Eye,
  Play
} from 'lucide-react';
import { usePageControllerContext } from '@/contexts/PageControllerContext';
import { aiActionBridge } from '@/ai-assistant/AIActionBridge';
import { ActionDefinition, UserContext } from '@/controllers/types/ActionTypes';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  data?: AssistantQueryResponse;
  timestamp: Date;
  actions?: ActionDefinition[];
  executedAction?: {
    actionId: string;
    params: Record<string, unknown>;
    result: unknown;
  };
}

const EnhancedAIChatInterface: React.FC = () => {
  const { user, orgId } = useAppSelector((state) => state.auth);
  const { currentPageController } = usePageControllerContext();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableActions, setAvailableActions] = useState<ActionDefinition[]>([]);
  const [showActions, setShowActions] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build user context for AI
  const userContext: UserContext = useMemo(() => ({
    userId: user?.id || 'anonymous',
    username: user?.email || 'anonymous',
    email: user?.email || '',
    roles: [], // Will be populated from auth state
    permissions: [], // Will be populated from auth state
    organizationId: orgId || undefined,
    organizationRoles: []
  }), [user?.id, user?.email, orgId]);

  // Load available actions when component mounts or page changes
  useEffect(() => {
    if (user) {
      const actions = aiActionBridge.getAvailableActionsForUser(userContext);
      setAvailableActions(actions);
    }
  }, [user, orgId, currentPageController, userContext]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Search for relevant actions based on the query
      const relevantActions = aiActionBridge.searchActionsByNaturalLanguage(
        inputValue,
        userContext,
        5
      );

      // Send query to AI assistant with action context
      const apiResponse = await aiAssistantApi.aiAssistantQuery({
        query: inputValue,
        context: {
          conversationId: 'default', // Could be made dynamic
          messages: [], // Pass any existing conversation messages if needed
          availableActions: relevantActions.map(a => ({ id: a.id, name: a.name, description: a.description }))
        },
        organizationId: orgId
      });

      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Failed to get AI response');
      }

      const response: AssistantQueryResponse = apiResponse.data;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'assistant',
        data: response,
        timestamp: new Date(),
        actions: relevantActions.length > 0 ? relevantActions : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error querying assistant:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      
      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${errorMessage}`,
        sender: 'system',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, user, orgId, currentPageController, userContext]);

  // Execute an action
  const executeAction = useCallback(async (actionId: string, params: Record<string, unknown> = {}) => {
    setIsLoading(true);
    
    try {
      const result = await aiActionBridge.executeActionForAI(actionId, params, userContext);
      
      const executionMessage: ChatMessage = {
        id: Date.now().toString(),
        text: result.success 
          ? `✅ Action "${actionId}" executed successfully: ${result.message || 'Completed'}`
          : `❌ Action "${actionId}" failed: ${result.error || 'Unknown error'}`,
        sender: 'system',
        timestamp: new Date(),
        executedAction: {
          actionId,
          params,
          result
        }
      };

      setMessages(prev => [...prev, executionMessage]);

      // If the action was successful and returned data, show it
      if (result.success && result.data) {
        const dataMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `📊 Result data:\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``,
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, dataMessage]);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorChatMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `❌ Failed to execute action "${actionId}": ${errorMessage}`,
        sender: 'system',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userContext]);

  // Quick action suggestions
  const quickActions = [
    "What can you help me with?",
    "Show me available actions",
    "Refresh the current page data",
    "Navigate to settings"
  ];

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-background border rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Assistant</h3>
          {currentPageController && (
            <Badge variant="outline" className="text-xs">
              {currentPageController.pageName}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="text-xs"
          >
            <Eye className="h-4 w-4 mr-1" />
            Actions ({availableActions.length})
          </Button>
        </div>
      </div>

      {/* Available Actions Panel */}
      {showActions && (
        <div className="p-4 border-b bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Available Actions</h4>
          <div className="grid gap-2 max-h-32 overflow-y-auto">
            {availableActions.slice(0, 5).map((action) => (
              <div key={action.id} className="flex items-center justify-between p-2 bg-background rounded border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => executeAction(action.id)}
                  className="ml-2 h-6 px-2"
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Welcome to AI Assistant</p>
              <p className="text-sm mb-4">
                I can help you navigate and perform actions on this page. Try asking:
              </p>
              <div className="grid gap-2 max-w-sm mx-auto">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue(action)}
                    className="text-xs"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.sender === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  message.sender === 'user'
                    ? "bg-primary text-primary-foreground"
                    : message.sender === 'system'
                    ? "bg-muted border"
                    : "bg-muted border"
                )}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
                
                {/* Show suggested actions */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-2 opacity-70">Suggested Actions:</p>
                    <div className="grid gap-1">
                      {message.actions.slice(0, 3).map((action) => (
                        <Button
                          key={action.id}
                          variant="ghost"
                          size="sm"
                          onClick={() => executeAction(action.id)}
                          className="justify-start h-auto p-2 text-xs"
                        >
                          <Zap className="h-3 w-3 mr-2" />
                          <div className="text-left">
                            <div className="font-medium">{action.name}</div>
                            <div className="opacity-70 truncate">{action.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show execution result */}
                {message.executedAction && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <Badge variant="outline" className="text-xs">
                      Executed: {message.executedAction.actionId}
                    </Badge>
                  </div>
                )}

                <div className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted border rounded-lg px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Thinking...
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <Alert className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything or request an action..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EnhancedAIChatInterface;