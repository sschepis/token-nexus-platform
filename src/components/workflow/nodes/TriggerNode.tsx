import React from 'react';
import { BaseNode, BaseNodeProps } from './BaseNode';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Clock, 
  Webhook, 
  Database, 
  User, 
  Calendar,
  Globe,
  FileText 
} from 'lucide-react';

const getTriggerIcon = (triggerType: string) => {
  switch (triggerType) {
    case 'parse':
    case 'parse-trigger':
      return <Database className="h-4 w-4" />;
    case 'webhook':
    case 'webhook-trigger':
      return <Webhook className="h-4 w-4" />;
    case 'schedule':
    case 'schedule-trigger':
      return <Clock className="h-4 w-4" />;
    case 'manual':
      return <User className="h-4 w-4" />;
    case 'event':
      return <Zap className="h-4 w-4" />;
    case 'cron':
      return <Calendar className="h-4 w-4" />;
    case 'http':
      return <Globe className="h-4 w-4" />;
    case 'file':
      return <FileText className="h-4 w-4" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
};

const getTriggerTypeLabel = (triggerType: string) => {
  switch (triggerType) {
    case 'parse':
    case 'parse-trigger':
      return 'Parse Server';
    case 'webhook':
    case 'webhook-trigger':
      return 'Webhook';
    case 'schedule':
    case 'schedule-trigger':
      return 'Schedule';
    case 'manual':
      return 'Manual';
    case 'event':
      return 'Event';
    case 'cron':
      return 'Cron Job';
    case 'http':
      return 'HTTP Request';
    case 'file':
      return 'File Watch';
    default:
      return 'Trigger';
  }
};

const getTriggerDescription = (config: Record<string, any>) => {
  if (config.className && config.triggerEvent) {
    return `${config.className} ${config.triggerEvent}`;
  }
  
  if (config.webhookUrl) {
    return `Webhook: ${config.webhookUrl}`;
  }
  
  if (config.schedule) {
    return `Schedule: ${config.schedule}`;
  }
  
  if (config.cronExpression) {
    return `Cron: ${config.cronExpression}`;
  }
  
  return 'Trigger configuration';
};

export const TriggerNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props;
  const triggerType = data.config.triggerType || props.type;
  const triggerIcon = getTriggerIcon(triggerType);
  const triggerTypeLabel = getTriggerTypeLabel(triggerType);
  const triggerDescription = getTriggerDescription(data.config);

  // Enhanced data with trigger-specific information
  const enhancedData = {
    ...data,
    description: triggerDescription,
  };

  return (
    <div className="relative">
      <BaseNode {...props} data={enhancedData} />
      
      {/* Trigger-specific overlay */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {triggerIcon}
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
          {triggerTypeLabel}
        </Badge>
      </div>

      {/* Configuration indicators */}
      {data.config.conditions && (
        <div className="absolute bottom-2 right-2">
          <Badge variant="outline" className="text-xs">
            {Array.isArray(data.config.conditions) 
              ? `${data.config.conditions.length} conditions`
              : 'Conditional'
            }
          </Badge>
        </div>
      )}
    </div>
  );
};

export default TriggerNode;