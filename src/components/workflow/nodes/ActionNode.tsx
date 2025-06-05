import React from 'react';
import { BaseNode, BaseNodeProps } from './BaseNode';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Database, 
  Bell, 
  Cloud, 
  Bot, 
  Send,
  Code,
  Workflow,
  ExternalLink,
  MessageSquare,
  FileText,
  Settings
} from 'lucide-react';

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'email':
    case 'email-action':
      return <Mail className="h-4 w-4" />;
    case 'notification':
    case 'notification-action':
      return <Bell className="h-4 w-4" />;
    case 'database':
    case 'db-action':
      return <Database className="h-4 w-4" />;
    case 'cloudFunction':
    case 'cloud-function':
      return <Cloud className="h-4 w-4" />;
    case 'ai':
    case 'ai-action':
      return <Bot className="h-4 w-4" />;
    case 'api':
    case 'api-action':
    case 'http':
      return <ExternalLink className="h-4 w-4" />;
    case 'workflow':
    case 'workflow-action':
      return <Workflow className="h-4 w-4" />;
    case 'sms':
      return <MessageSquare className="h-4 w-4" />;
    case 'file':
      return <FileText className="h-4 w-4" />;
    case 'custom':
      return <Code className="h-4 w-4" />;
    default:
      return <Send className="h-4 w-4" />;
  }
};

const getActionTypeLabel = (actionType: string) => {
  switch (actionType) {
    case 'email':
    case 'email-action':
      return 'Email';
    case 'notification':
    case 'notification-action':
      return 'Notification';
    case 'database':
    case 'db-action':
      return 'Database';
    case 'cloudFunction':
    case 'cloud-function':
      return 'Cloud Function';
    case 'ai':
    case 'ai-action':
      return 'AI Assistant';
    case 'api':
    case 'api-action':
    case 'http':
      return 'API Call';
    case 'workflow':
    case 'workflow-action':
      return 'Sub-Workflow';
    case 'sms':
      return 'SMS';
    case 'file':
      return 'File Operation';
    case 'custom':
      return 'Custom Code';
    default:
      return 'Action';
  }
};

const getActionDescription = (config: Record<string, any>) => {
  if (config.template && config.to) {
    return `Send ${config.template} to ${config.to}`;
  }
  
  if (config.method && config.url) {
    return `${config.method.toUpperCase()} ${config.url}`;
  }
  
  if (config.functionId) {
    return `Execute function: ${config.functionId}`;
  }
  
  if (config.workflowId) {
    return `Execute workflow: ${config.workflowId}`;
  }
  
  if (config.notificationType && config.message) {
    return `${config.notificationType}: ${config.message.substring(0, 30)}...`;
  }
  
  if (config.aiPrompt) {
    return `AI: ${config.aiPrompt.substring(0, 30)}...`;
  }
  
  if (config.query) {
    return `Query: ${config.query.substring(0, 30)}...`;
  }
  
  return 'Action configuration';
};

const getActionStatus = (config: Record<string, any>) => {
  if (config.retryCount && config.retryCount > 0) {
    return `${config.retryCount} retries`;
  }
  
  if (config.timeout) {
    return `${config.timeout}ms timeout`;
  }
  
  return null;
};

export const ActionNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props;
  const actionType = data.config.actionType || props.type;
  const actionIcon = getActionIcon(actionType);
  const actionTypeLabel = getActionTypeLabel(actionType);
  const actionDescription = getActionDescription(data.config);
  const actionStatus = getActionStatus(data.config);

  // Enhanced data with action-specific information
  const enhancedData = {
    ...data,
    description: actionDescription,
  };

  return (
    <div className="relative">
      <BaseNode {...props} data={enhancedData} />
      
      {/* Action-specific overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {actionIcon}
        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
          {actionTypeLabel}
        </Badge>
      </div>

      {/* Configuration indicators */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
        {actionStatus && (
          <Badge variant="outline" className="text-xs">
            {actionStatus}
          </Badge>
        )}
        
        {data.config.async && (
          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
            Async
          </Badge>
        )}
        
        {data.config.critical && (
          <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
            Critical
          </Badge>
        )}
      </div>

      {/* Service integration indicator */}
      {data.serviceIntegration && (
        <div className="absolute top-2 right-2">
          <Settings className="h-3 w-3 text-gray-500" />
        </div>
      )}
    </div>
  );
};

export default ActionNode;