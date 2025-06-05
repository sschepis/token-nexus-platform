import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { 
  MessageSquare, 
  Send, 
  Inbox, 
  Share2, 
  Radio,
  Users, 
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import Parse from 'parse';
import { toast } from 'sonner';

interface CommunicationChannel {
  id: string;
  name: string;
  description: string;
  type: 'broadcast' | 'direct' | 'event' | 'data_sync';
  participants: string[]; // App IDs
  isPublic: boolean;
  messageCount: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface AppMessage {
  id: string;
  channelId: string;
  fromAppId: string;
  fromAppName: string;
  toAppId?: string;
  toAppName?: string;
  messageType: 'text' | 'data' | 'event' | 'command' | 'response';
  subject?: string;
  content: any;
  metadata?: Record<string, any>;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  expiresAt?: string;
  responseRequired: boolean;
  responseReceived?: boolean;
}

interface EventSubscription {
  id: string;
  appId: string;
  appName: string;
  eventType: string;
  eventPattern?: string;
  callbackUrl?: string;
  isActive: boolean;
  subscriptionCount: number;
  lastTriggered?: string;
  createdAt: string;
}

interface DataSyncRule {
  id: string;
  name: string;
  sourceAppId: string;
  sourceAppName: string;
  targetAppId: string;
  targetAppName: string;
  dataType: string;
  syncDirection: 'one_way' | 'two_way';
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'manual';
  isActive: boolean;
  lastSync?: string;
  syncCount: number;
  errorCount: number;
  createdAt: string;
}

export const AppCommunicationHub: React.FC = () => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const [channels, setChannels] = useState<CommunicationChannel[]>([]);
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<EventSubscription[]>([]);
  const [syncRules, setSyncRules] = useState<DataSyncRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('channels');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [messageFilter, setMessageFilter] = useState('all');

  // Form states
  const [newMessage, setNewMessage] = useState({
    channelId: '',
    toAppId: '',
    messageType: 'text' as AppMessage['messageType'],
    subject: '',
    content: '',
    priority: 'normal' as AppMessage['priority'],
    responseRequired: false,
    expiresIn: 24 // hours
  });

  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    type: 'direct' as CommunicationChannel['type'],
    participants: [] as string[],
    isPublic: false
  });

  useEffect(() => {
    loadCommunicationData();
  }, [currentOrg]);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);
      
      const [channelsResult, messagesResult, subscriptionsResult, syncRulesResult] = await Promise.all([
        Parse.Cloud.run('getCommunicationChannels', { organizationId: currentOrg?.id }),
        Parse.Cloud.run('getAppMessages', { 
          organizationId: currentOrg?.id,
          channelId: selectedChannel,
          filter: messageFilter,
          limit: 100
        }),
        Parse.Cloud.run('getEventSubscriptions', { organizationId: currentOrg?.id }),
        Parse.Cloud.run('getDataSyncRules', { organizationId: currentOrg?.id })
      ]);

      setChannels(channelsResult.channels || []);
      setMessages(messagesResult.messages || []);
      setSubscriptions(subscriptionsResult.subscriptions || []);
      setSyncRules(syncRulesResult.rules || []);
    } catch (error) {
      console.error('Failed to load communication data:', error);
      toast.error('Failed to load communication data');
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    try {
      await Parse.Cloud.run('createCommunicationChannel', {
        organizationId: currentOrg?.id,
        ...newChannel
      });
      
      toast.success('Communication channel created successfully');
      setNewChannel({
        name: '',
        description: '',
        type: 'direct',
        participants: [],
        isPublic: false
      });
      await loadCommunicationData();
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error('Failed to create communication channel');
    }
  };

  const sendMessage = async () => {
    try {
      if (!newMessage.content.trim()) {
        toast.error('Please enter message content');
        return;
      }

      await Parse.Cloud.run('sendAppMessage', {
        organizationId: currentOrg?.id,
        ...newMessage,
        content: newMessage.messageType === 'data' 
          ? JSON.parse(newMessage.content) 
          : newMessage.content,
        expiresAt: newMessage.expiresIn > 0 
          ? new Date(Date.now() + newMessage.expiresIn * 60 * 60 * 1000).toISOString()
          : undefined
      });
      
      toast.success('Message sent successfully');
      setNewMessage({
        channelId: '',
        toAppId: '',
        messageType: 'text',
        subject: '',
        content: '',
        priority: 'normal',
        responseRequired: false,
        expiresIn: 24
      });
      await loadCommunicationData();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const createEventSubscription = async (subscriptionData: Partial<EventSubscription>) => {
    try {
      await Parse.Cloud.run('createEventSubscription', {
        organizationId: currentOrg?.id,
        ...subscriptionData
      });
      
      toast.success('Event subscription created successfully');
      await loadCommunicationData();
    } catch (error) {
      console.error('Failed to create subscription:', error);
      toast.error('Failed to create event subscription');
    }
  };

  const createSyncRule = async (ruleData: Partial<DataSyncRule>) => {
    try {
      await Parse.Cloud.run('createDataSyncRule', {
        organizationId: currentOrg?.id,
        ...ruleData
      });
      
      toast.success('Data sync rule created successfully');
      await loadCommunicationData();
    } catch (error) {
      console.error('Failed to create sync rule:', error);
      toast.error('Failed to create data sync rule');
    }
  };

  const triggerSync = async (ruleId: string) => {
    try {
      await Parse.Cloud.run('triggerDataSync', { ruleId });
      toast.success('Data sync triggered successfully');
      await loadCommunicationData();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      toast.error('Failed to trigger data sync');
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await Parse.Cloud.run('markMessageAsRead', { messageId });
      await loadCommunicationData();
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'read':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getChannelTypeIcon = (type: string) => {
    switch (type) {
      case 'broadcast':
        return <Radio className="h-4 w-4" />;
      case 'direct':
        return <MessageSquare className="h-4 w-4" />;
      case 'event':
        return <Bell className="h-4 w-4" />;
      case 'data_sync':
        return <Share2 className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <MessageSquare className="h-8 w-8 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">App Communication Hub</h1>
          <p className="text-muted-foreground">
            Manage inter-app messaging, events, and data synchronization
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadCommunicationData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Channel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">
            <MessageSquare className="h-4 w-4 mr-2" />
            Channels ({channels.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            <Inbox className="h-4 w-4 mr-2" />
            Messages ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="events">
            <Bell className="h-4 w-4 mr-2" />
            Events ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="sync">
            <Share2 className="h-4 w-4 mr-2" />
            Data Sync ({syncRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <div className="grid gap-4">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getChannelTypeIcon(channel.type)}
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                      <Badge variant="outline">{channel.type.replace('_', ' ')}</Badge>
                      {channel.isPublic && <Badge variant="secondary">Public</Badge>}
                      <Badge className={channel.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                        {channel.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedChannel(channel.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Messages
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{channel.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Participants</p>
                      <p className="text-muted-foreground">{channel.participants.length} apps</p>
                    </div>
                    <div>
                      <p className="font-medium">Messages</p>
                      <p className="text-muted-foreground">{channel.messageCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Activity</p>
                      <p className="text-muted-foreground">
                        {new Date(channel.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-muted-foreground">
                        {new Date(channel.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <select
                value={messageFilter}
                onChange={(e) => setMessageFilter(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">All Messages</option>
                <option value="unread">Unread</option>
                <option value="urgent">Urgent</option>
                <option value="responses_required">Responses Required</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input placeholder="Search messages..." className="w-64" />
            </div>
          </div>

          {/* Send Message Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="message-channel">Channel</Label>
                  <select
                    id="message-channel"
                    value={newMessage.channelId}
                    onChange={(e) => setNewMessage({ ...newMessage, channelId: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select Channel</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="message-type">Type</Label>
                  <select
                    id="message-type"
                    value={newMessage.messageType}
                    onChange={(e) => setNewMessage({ ...newMessage, messageType: e.target.value as AppMessage['messageType'] })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="text">Text</option>
                    <option value="data">Data</option>
                    <option value="event">Event</option>
                    <option value="command">Command</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="message-priority">Priority</Label>
                  <select
                    id="message-priority"
                    value={newMessage.priority}
                    onChange={(e) => setNewMessage({ ...newMessage, priority: e.target.value as AppMessage['priority'] })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="message-subject">Subject</Label>
                <Input
                  id="message-subject"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                  placeholder="Message subject"
                />
              </div>

              <div>
                <Label htmlFor="message-content">Content</Label>
                <Textarea
                  id="message-content"
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder={newMessage.messageType === 'data' ? '{"key": "value"}' : 'Message content...'}
                  className={newMessage.messageType === 'data' ? 'font-mono' : ''}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="response-required"
                    checked={newMessage.responseRequired}
                    onCheckedChange={(checked) => setNewMessage({ ...newMessage, responseRequired: checked })}
                  />
                  <Label htmlFor="response-required">Response Required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="expires-in">Expires in (hours):</Label>
                  <Input
                    id="expires-in"
                    type="number"
                    value={newMessage.expiresIn}
                    onChange={(e) => setNewMessage({ ...newMessage, expiresIn: parseInt(e.target.value) })}
                    className="w-20"
                    min="0"
                  />
                </div>
              </div>

              <Button onClick={sendMessage}>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>

          {/* Messages List */}
          <div className="grid gap-4">
            {messages.map((message) => (
              <Card key={message.id} className={message.status === 'read' ? 'opacity-75' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMessageStatusIcon(message.status)}
                      <CardTitle className="text-lg">
                        {message.subject || `${message.messageType} message`}
                      </CardTitle>
                      <Badge className={getPriorityColor(message.priority)}>
                        {message.priority}
                      </Badge>
                      {message.responseRequired && (
                        <Badge variant="outline">Response Required</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {new Date(message.timestamp).toLocaleString()}
                      </span>
                      {message.status !== 'read' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => markMessageAsRead(message.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    From: {message.fromAppName} 
                    {message.toAppName && ` → To: ${message.toAppName}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {message.messageType === 'data' ? (
                      <pre className="bg-gray-50 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(message.content, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    
                    {message.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {new Date(message.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="grid gap-4">
            {subscriptions.map((subscription) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      <CardTitle className="text-lg">{subscription.appName}</CardTitle>
                      <Badge variant="outline">{subscription.eventType}</Badge>
                      <Badge className={subscription.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                        {subscription.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Switch
                        checked={subscription.isActive}
                        onCheckedChange={(checked) => {
                          // Toggle subscription
                        }}
                      />
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Event Pattern</p>
                      <p className="text-muted-foreground font-mono">
                        {subscription.eventPattern || 'All events'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Triggers</p>
                      <p className="text-muted-foreground">{subscription.subscriptionCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Last Triggered</p>
                      <p className="text-muted-foreground">
                        {subscription.lastTriggered 
                          ? new Date(subscription.lastTriggered).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Callback URL</p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {subscription.callbackUrl || 'Internal'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <div className="grid gap-4">
            {syncRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-5 w-5" />
                      <CardTitle className="text-lg">{rule.name}</CardTitle>
                      <Badge variant="outline">{rule.syncDirection.replace('_', ' ')}</Badge>
                      <Badge variant="secondary">{rule.syncFrequency.replace('_', ' ')}</Badge>
                      <Badge className={rule.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => triggerSync(rule.id)}
                        disabled={!rule.isActive}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Source → Target</p>
                      <p className="text-muted-foreground">
                        {rule.sourceAppName} → {rule.targetAppName}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Data Type</p>
                      <p className="text-muted-foreground">{rule.dataType}</p>
                    </div>
                    <div>
                      <p className="font-medium">Sync Count</p>
                      <p className="text-muted-foreground">
                        {rule.syncCount} ({rule.errorCount} errors)
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Last Sync</p>
                      <p className="text-muted-foreground">
                        {rule.lastSync 
                          ? new Date(rule.lastSync).toLocaleString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};