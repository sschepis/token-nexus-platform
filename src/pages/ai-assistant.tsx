import React, { useEffect, useState } from 'react';
import { usePageController } from '@/hooks/usePageController';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  MessageSquare,
  RefreshCw,
  Loader2,
  Search,
  Archive,
  Trash2,
  Send
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AIChatInterface from '@/components/ai-assistant/AIChatInterface';

interface Conversation {
  objectId: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  status: string;
  updatedAt: string;
  createdAt: string;
}

const AIAssistantPage: React.FC = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'ai-assistant',
    pageName: 'AI Assistant',
    description: 'Manage AI assistant interactions, conversations, and configurations',
    category: 'ai',
    permissions: ['ai:read', 'ai:write', 'ai:manage'],
    tags: ['ai', 'assistant', 'chat', 'automation', 'intelligence']
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [newConversationMessage, setNewConversationMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    if (pageController.isRegistered) {
      loadConversations();
    }
  }, [pageController.isRegistered]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      setError(null);
    }
  }, [error, toast]);

  const loadConversations = async () => {
    if (!pageController.isRegistered) return;
    
    setIsLoadingConversations(true);
    setError(null);
    
    try {
      const params: any = {};
      if (searchTerm) {
        params.searchTerm = searchTerm;
      }
      
      const result = await pageController.executeAction('fetchConversations', params);
      if (result.success && result.data) {
        const responseData = result.data as any;
        if (responseData.conversations && Array.isArray(responseData.conversations)) {
          setConversations(responseData.conversations);
        } else {
          setConversations([]);
        }
      } else {
        setError(result.error || 'Failed to load conversations');
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!newConversationMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter an initial message",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingConversation(true);
    
    try {
      const result = await pageController.executeAction('createConversation', {
        title: newConversationTitle || 'New Conversation',
        initialMessage: newConversationMessage
      });
      
      if (result.success) {
        toast({
          title: "Conversation Created",
          description: "New conversation started successfully",
        });
        setShowNewConversationDialog(false);
        setNewConversationTitle('');
        setNewConversationMessage('');
        await loadConversations();
      } else {
        setError(result.error || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleRefresh = () => {
    loadConversations();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI conversations and get intelligent assistance for your organization
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoadingConversations}>
            {isLoadingConversations ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          {hasPermission('ai:write') && (
            <Button size="sm" onClick={() => setShowNewConversationDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversations
              </CardTitle>
              <CardDescription>
                Your AI assistant conversation history
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoadingConversations ? (
                  Array(5).fill(0).map((_, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.objectId}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedConversation?.objectId === conversation.objectId ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{conversation.title}</h4>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conversation.lastMessage}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {conversation.messageCount} messages
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(conversation.updatedAt)}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Archive className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              Archive conversation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete conversation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations found</p>
                    <p className="text-xs">Start a new conversation to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>
                {selectedConversation ? selectedConversation.title : 'AI Assistant Chat'}
              </CardTitle>
              <CardDescription>
                {selectedConversation
                  ? `Conversation started ${formatDate(selectedConversation.createdAt)}`
                  : 'Ask questions or request actions related to your organization'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full">
              <AIChatInterface />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Conversation Dialog */}
      <AlertDialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new conversation with the AI assistant
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title (optional)</label>
              <Input
                placeholder="Conversation title..."
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Initial Message</label>
              <Input
                placeholder="How can I help you today?"
                value={newConversationMessage}
                onChange={(e) => setNewConversationMessage(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingConversation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateConversation}
              disabled={isCreatingConversation || !newConversationMessage.trim()}
            >
              {isCreatingConversation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Start Conversation
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIAssistantPage;