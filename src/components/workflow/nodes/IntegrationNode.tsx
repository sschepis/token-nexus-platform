import React from 'react';
import { BaseNode, BaseNodeProps } from './BaseNode';
import { Badge } from '@/components/ui/badge';
import { 
  Plug, 
  Key, 
  Shield, 
  Zap,
  Cloud,
  Database,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  CreditCard,
  Users,
  BarChart,
  Settings
} from 'lucide-react';

const getIntegrationIcon = (integrationType: string, appId?: string) => {
  // First check for specific app integrations
  if (appId) {
    switch (appId.toLowerCase()) {
      case 'slack':
        return <MessageSquare className="h-4 w-4" />;
      case 'gmail':
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'google-calendar':
      case 'calendar':
        return <Calendar className="h-4 w-4" />;
      case 'stripe':
        return <CreditCard className="h-4 w-4" />;
      case 'salesforce':
        return <Users className="h-4 w-4" />;
      case 'analytics':
        return <BarChart className="h-4 w-4" />;
      case 'dropbox':
      case 'google-drive':
        return <FileText className="h-4 w-4" />;
      default:
        break;
    }
  }

  // Then check by integration type
  switch (integrationType) {
    case 'app':
      return <Smartphone className="h-4 w-4" />;
    case 'oauth':
      return <Shield className="h-4 w-4" />;
    case 'apiKey':
      return <Key className="h-4 w-4" />;
    case 'webhook':
      return <Zap className="h-4 w-4" />;
    case 'database':
      return <Database className="h-4 w-4" />;
    case 'cloud':
      return <Cloud className="h-4 w-4" />;
    case 'api':
      return <Globe className="h-4 w-4" />;
    case 'custom':
      return <Settings className="h-4 w-4" />;
    default:
      return <Plug className="h-4 w-4" />;
  }
};

const getIntegrationTypeLabel = (integrationType: string) => {
  switch (integrationType) {
    case 'app':
      return 'App Integration';
    case 'oauth':
      return 'OAuth';
    case 'apiKey':
      return 'API Key';
    case 'webhook':
      return 'Webhook';
    case 'database':
      return 'Database';
    case 'cloud':
      return 'Cloud Service';
    case 'api':
      return 'REST API';
    case 'custom':
      return 'Custom';
    default:
      return 'Integration';
  }
};

const getIntegrationDescription = (config: Record<string, any>) => {
  if (config.appId) {
    return `${config.appId} integration`;
  }
  
  if (config.integrationId) {
    return `Integration: ${config.integrationId}`;
  }
  
  if (config.apiEndpoint) {
    return `API: ${config.apiEndpoint}`;
  }
  
  if (config.oauthAppId) {
    return `OAuth: ${config.oauthAppId}`;
  }
  
  if (config.webhookUrl) {
    return `Webhook: ${config.webhookUrl}`;
  }
  
  if (config.databaseUrl) {
    return `DB: ${config.databaseUrl}`;
  }
  
  return 'Integration configuration';
};

const getIntegrationStatus = (config: Record<string, any>) => {
  if (config.authenticated === false) {
    return 'Not authenticated';
  }
  
  if (config.connected === false) {
    return 'Disconnected';
  }
  
  if (config.rateLimited) {
    return 'Rate limited';
  }
  
  if (config.deprecated) {
    return 'Deprecated';
  }
  
  return null;
};

const getSecurityLevel = (integrationType: string) => {
  switch (integrationType) {
    case 'oauth':
      return 'high';
    case 'apiKey':
      return 'medium';
    case 'webhook':
      return 'medium';
    case 'custom':
      return 'low';
    default:
      return 'medium';
  }
};

export const IntegrationNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props;
  const integrationType = data.config.integrationType || 'app';
  const integrationIcon = getIntegrationIcon(integrationType, data.config.appId);
  const integrationTypeLabel = getIntegrationTypeLabel(integrationType);
  const integrationDescription = getIntegrationDescription(data.config);
  const integrationStatus = getIntegrationStatus(data.config);
  const securityLevel = getSecurityLevel(integrationType);

  // Data with integration-specific information
  const nodeData = {
    ...data,
    description: integrationDescription,
  };

  return (
    <div className="relative">
      <BaseNode {...props} data={nodeData} />
      
      {/* Integration-specific overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {integrationIcon}
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
          {integrationTypeLabel}
        </Badge>
      </div>

      {/* Security level indicator */}
      <div className="absolute top-2 right-2">
        <Badge 
          variant="outline" 
          className={`text-xs ${
            securityLevel === 'high' 
              ? 'bg-green-50 text-green-700 border-green-200'
              : securityLevel === 'medium'
              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {securityLevel} security
        </Badge>
      </div>

      {/* Status indicators */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        {integrationStatus && (
          <Badge 
            variant="outline" 
            className={`text-xs ${
              integrationStatus.includes('Not') || integrationStatus.includes('Disconnected')
                ? 'bg-red-50 text-red-700'
                : integrationStatus.includes('Rate limited')
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-gray-50 text-gray-700'
            }`}
          >
            {integrationStatus}
          </Badge>
        )}
        
        {data.config.requiresAuth && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
            Auth Required
          </Badge>
        )}
        
        {data.config.sandbox && (
          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
            Sandbox
          </Badge>
        )}
      </div>

      {/* App-specific branding */}
      {data.config.appId && (
        <div className="absolute bottom-2 left-2">
          <Badge variant="outline" className="text-xs">
            {data.config.appId}
          </Badge>
        </div>
      )}

      {/* Rate limit indicator */}
      {data.config.rateLimit && (
        <div className="absolute top-8 right-2">
          <Badge variant="outline" className="text-xs text-gray-600">
            {data.config.rateLimit}/min
          </Badge>
        </div>
      )}
    </div>
  );
};

export default IntegrationNode;