export interface CommunicationChannel {
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

export interface AppMessage {
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

export interface EventSubscription {
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

export interface DataSyncRule {
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

export interface CreateChannelParams {
  organizationId: string;
  name: string;
  description: string;
  type: 'broadcast' | 'direct' | 'event' | 'data_sync';
  participants: string[];
  isPublic: boolean;
}

export interface SendMessageParams {
  organizationId: string;
  channelId: string;
  toAppId?: string;
  messageType: 'text' | 'data' | 'event' | 'command' | 'response';
  subject?: string;
  content: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;
  expiresAt?: string;
  responseRequired: boolean;
  responseReceived?: boolean;
}

export interface GetMessagesParams {
  organizationId: string;
  channelId?: string;
  filter?: string;
  limit?: number;
}

export interface CreateSubscriptionParams {
  organizationId: string;
  appId: string;
  eventType: string;
  eventPattern?: string;
  callbackUrl?: string;
}

export interface CreateSyncRuleParams {
  organizationId: string;
  name: string;
  sourceAppId: string;
  targetAppId: string;
  dataType: string;
  syncDirection: 'one_way' | 'two_way';
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'manual';
}