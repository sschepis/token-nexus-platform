// src/components/ai-assistant/AIChatInterface.tsx
import React, { useState, useCallback, FormEvent, useRef, useEffect } from 'react';
import Parse from 'parse';
import { AssistantQueryResponse } from '../../ai-assistant/types';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAppSelector } from '@/store/hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  AlertCircle, 
  MoreVertical,
  History,
  Trash2,
  Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  data?: AssistantQueryResponse;
  timestamp: Date;
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
}

interface ConversationTurn {
  id: string;
  userQuery: string;
  assistantResponse: string;
  structuredData?: unknown;
  timestamp: string;
}

interface ConversationHistoryResponse {
  success: boolean;
  conversations?: ConversationSummary[];
  turns?: ConversationTurn[];
  conversationId?: string;
}

const AIChatInterface: React.FC = () => {
  const { orgId } = useAppSelector((state) => state.auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [structuredData, setStructuredData] = useState<unknown>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const result = await Parse.Cloud.run('getConversationHistory', {}) as ConversationHistoryResponse;
      if (result.success && result.conversations) {
        setConversations(result.conversations.map((conv) => ({
          ...conv,
          updatedAt: new Date(conv.updatedAt)
        })));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const result = await Parse.Cloud.run('getConversationHistory', {
        conversationId: convId
      }) as ConversationHistoryResponse;
      
      if (result.success && result.turns) {
        const loadedMessages: ChatMessage[] = [];
        result.turns.forEach((turn) => {
          // Add user message
          loadedMessages.push({
            id: `${turn.id}_user`,
            text: turn.userQuery,
            sender: 'user',
            timestamp: new Date(turn.timestamp)
          });
          // Add assistant response
          loadedMessages.push({
            id: `${turn.id}_assistant`,
            text: turn.assistantResponse,
            sender: 'assistant',
            data: { 
              response: turn.assistantResponse, 
              structuredData: turn.structuredData,
              conversationId: convId
            } as AssistantQueryResponse,
            timestamp: new Date(turn.timestamp)
          });
        });
        
        setMessages(loadedMessages);
        setConversationId(convId);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setError('Failed to load conversation history');
    }
  };

  const clearConversation = async () => {
    if (!conversationId) {
      // Just clear local state
      setMessages([]);
      setSuggestions([]);
      setStructuredData(null);
      return;
    }

    try {
      await Parse.Cloud.run('clearConversation', { conversationId });
      setMessages([]);
      setSuggestions([]);
      setStructuredData(null);
      loadConversations(); // Refresh conversation list
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      setError('Failed to clear conversation');
    }
  };

  const handleSendMessage = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        query: userMessage.text,
        conversationId: conversationId,
        messages: messages.filter(msg => msg.sender !== 'system').map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }))
      };
      
      // Call the Parse Cloud function
      const result = await Parse.Cloud.run("assistantQuery", params);
      
      if (result.success) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_assistant`,
          text: result.response,
          sender: 'assistant',
          data: result,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(result.conversationId);
        
        // Update suggestions if provided
        if (result.suggestions && result.suggestions.length > 0) {
          setSuggestions(result.suggestions);
        }
        
        // Store structured data if provided
        if (result.structuredData) {
          setStructuredData(result.structuredData);
        }
        
        // Refresh conversation list
        loadConversations();
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }

    } catch (err: unknown) {
      console.error("Failed to send message to AI assistant:", err);
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      // For Parse.Error, it might have a specific structure
      if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as {message: unknown}).message === 'string') {
        errorMessage = (err as {message: string}).message;
      }
      setError(errorMessage);
      const systemMessage: ChatMessage = {
        id: `msg_${Date.now()}_system_comm_error`,
        text: `Communication error: ${errorMessage}`,
        sender: 'system',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, systemMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, conversationId, messages]);

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const newConversation = () => {
    setConversationId(undefined);
    setMessages([]);
    setSuggestions([]);
    setStructuredData(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-medium">AI Assistant</h3>
          {conversationId && (
            <Badge variant="outline" className="text-xs">
              Active Session
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowHistory(!showHistory)}>
              <History className="mr-2 h-4 w-4" />
              Conversation History
            </DropdownMenuItem>
            <DropdownMenuItem onClick={newConversation}>
              <MessageSquare className="mr-2 h-4 w-4" />
              New Conversation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearConversation} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Conversation History Panel */}
      {showHistory && (
        <div className="p-3 border-b bg-muted/50">
          <h4 className="text-sm font-medium mb-2">Recent Conversations</h4>
          <ScrollArea className="h-32">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {conversations.map(conv => (
                  <Card 
                    key={conv.id}
                    className="p-2 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => loadConversation(conv.id)}
                  >
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                    <p className="text-xs text-muted-foreground">
                      {conv.updatedAt.toLocaleString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-grow p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Hi! I'm your AI assistant for the Token Nexus Platform.
            </p>
            <p className="text-sm text-muted-foreground">
              I can help you query and manage your organizational data. Just ask me anything!
            </p>
          </div>
        )}
        
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "mb-3 flex",
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "py-2 px-3 rounded-lg inline-block max-w-[80%] break-words",
                msg.sender === 'user' ? 'bg-primary text-primary-foreground' : '',
                msg.sender === 'assistant' ? 'bg-muted' : '',
                msg.sender === 'system' ? 'bg-destructive/20 text-destructive border border-destructive/50 w-full text-center' : ''
              )}
            >
              {msg.sender === 'system' && <strong className="font-semibold">System: </strong>}
              {msg.text}
              {msg.sender === 'assistant' && msg.data?.structuredData && (
                <div className="mt-2 p-2 bg-background/50 rounded text-sm">
                  <details>
                    <summary className="cursor-pointer font-medium">View Data</summary>
                    <pre className="mt-2 overflow-x-auto">
                      {JSON.stringify(msg.data.structuredData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="bg-muted py-2 px-3 rounded-lg inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="m-3 mt-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 border-t">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything about your data..."
            disabled={isLoading}
            className="flex-grow"
            aria-label="Chat input"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()} size="sm">
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

export default AIChatInterface;