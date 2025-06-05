import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Plus,
  Zap,
  Send,
  GitBranch,
  Plug,
  Database,
  Clock,
  Webhook,
  Mail,
  Bell,
  Bot,
  Code,
  Filter,
  RotateCcw,
  Layers,
  Settings,
  ChevronDown,
  ChevronRight,
  Grip
} from 'lucide-react';
import { NodeCategory } from '@/types/workflows';

interface NodePaletteItem {
  id: string;
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  popular?: boolean;
  new?: boolean;
}

interface WorkflowSidebarProps {
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
  onNodeDragStart?: (event: React.DragEvent, nodeType: string) => void;
  onAddNode?: (nodeType: string, position: { x: number; y: number }) => void;
  className?: string;
}

// Default node palette items
const defaultNodePalette: NodePaletteItem[] = [
  // Triggers
  {
    id: 'parse-trigger',
    type: 'parse-trigger',
    category: 'trigger',
    name: 'Parse Server Trigger',
    description: 'Trigger on Parse Server object events',
    icon: <Database className="h-4 w-4" />,
    tags: ['parse', 'database', 'object', 'event'],
    popular: true,
  },
  {
    id: 'webhook-trigger',
    type: 'webhook-trigger',
    category: 'trigger',
    name: 'Webhook Trigger',
    description: 'Trigger on incoming webhook requests',
    icon: <Webhook className="h-4 w-4" />,
    tags: ['webhook', 'http', 'api'],
    popular: true,
  },
  {
    id: 'schedule-trigger',
    type: 'schedule-trigger',
    category: 'trigger',
    name: 'Schedule Trigger',
    description: 'Trigger on a schedule or cron expression',
    icon: <Clock className="h-4 w-4" />,
    tags: ['schedule', 'cron', 'time'],
  },

  // Actions
  {
    id: 'email-action',
    type: 'email-action',
    category: 'action',
    name: 'Send Email',
    description: 'Send email notifications',
    icon: <Mail className="h-4 w-4" />,
    tags: ['email', 'notification', 'send'],
    popular: true,
  },
  {
    id: 'notification-action',
    type: 'notification-action',
    category: 'action',
    name: 'Send Notification',
    description: 'Send push notifications',
    icon: <Bell className="h-4 w-4" />,
    tags: ['notification', 'push', 'alert'],
    popular: true,
  },
  {
    id: 'api-action',
    type: 'api-action',
    category: 'action',
    name: 'API Request',
    description: 'Make HTTP API requests',
    icon: <Send className="h-4 w-4" />,
    tags: ['api', 'http', 'request'],
    popular: true,
  },
  {
    id: 'ai-action',
    type: 'ai-action',
    category: 'action',
    name: 'AI Assistant',
    description: 'Process with AI assistant',
    icon: <Bot className="h-4 w-4" />,
    tags: ['ai', 'assistant', 'process'],
    new: true,
  },
  {
    id: 'workflow-action',
    type: 'workflow-action',
    category: 'action',
    name: 'Sub-Workflow',
    description: 'Execute another workflow',
    icon: <GitBranch className="h-4 w-4" />,
    tags: ['workflow', 'execute', 'sub'],
  },

  // Logic
  {
    id: 'condition-logic',
    type: 'condition-logic',
    category: 'logic',
    name: 'Condition',
    description: 'Branch based on conditions',
    icon: <GitBranch className="h-4 w-4" />,
    tags: ['condition', 'if', 'branch'],
    popular: true,
  },
  {
    id: 'loop-logic',
    type: 'loop-logic',
    category: 'logic',
    name: 'Loop',
    description: 'Repeat actions in a loop',
    icon: <RotateCcw className="h-4 w-4" />,
    tags: ['loop', 'repeat', 'iterate'],
  },
  {
    id: 'transform-logic',
    type: 'transform-logic',
    category: 'logic',
    name: 'Transform Data',
    description: 'Transform and manipulate data',
    icon: <Code className="h-4 w-4" />,
    tags: ['transform', 'data', 'manipulate'],
  },
  {
    id: 'delay-logic',
    type: 'delay-logic',
    category: 'logic',
    name: 'Delay',
    description: 'Add delays between actions',
    icon: <Clock className="h-4 w-4" />,
    tags: ['delay', 'wait', 'pause'],
  },
  {
    id: 'parallel-logic',
    type: 'parallel-logic',
    category: 'logic',
    name: 'Parallel',
    description: 'Execute actions in parallel',
    icon: <Layers className="h-4 w-4" />,
    tags: ['parallel', 'concurrent', 'async'],
  },

  // Integrations
  {
    id: 'slack-integration',
    type: 'integration',
    category: 'integration',
    name: 'Slack Integration',
    description: 'Connect with Slack',
    icon: <Plug className="h-4 w-4" />,
    tags: ['slack', 'chat', 'integration'],
  },
  {
    id: 'stripe-integration',
    type: 'integration',
    category: 'integration',
    name: 'Stripe Integration',
    description: 'Connect with Stripe payments',
    icon: <Plug className="h-4 w-4" />,
    tags: ['stripe', 'payment', 'integration'],
  },
];

const getCategoryIcon = (category: NodeCategory) => {
  switch (category) {
    case 'trigger':
      return <Zap className="h-4 w-4" />;
    case 'action':
      return <Send className="h-4 w-4" />;
    case 'logic':
      return <GitBranch className="h-4 w-4" />;
    case 'integration':
      return <Plug className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: NodeCategory) => {
  switch (category) {
    case 'trigger':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'action':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'logic':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'integration':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({
  selectedNodeId,
  onNodeSelect,
  onNodeDragStart,
  onAddNode,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(['trigger', 'action', 'logic', 'integration'] as NodeCategory[])
  );

  // Filter nodes based on search and category
  const filteredNodes = useMemo(() => {
    return defaultNodePalette.filter(node => {
      const matchesSearch = searchTerm === '' || 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = activeCategory === 'all' || node.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  // Group nodes by category
  const nodesByCategory = useMemo(() => {
    const grouped = new Map<NodeCategory, NodePaletteItem[]>();
    
    filteredNodes.forEach(node => {
      if (!grouped.has(node.category)) {
        grouped.set(node.category, []);
      }
      grouped.get(node.category)!.push(node);
    });

    return grouped;
  }, [filteredNodes]);

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
    onNodeDragStart?.(event, nodeType);
  };

  const toggleCategory = (category: NodeCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderNodeItem = (node: NodePaletteItem) => (
    <div
      key={node.id}
      className="group relative p-3 border rounded-lg cursor-move hover:shadow-md transition-all duration-200 bg-white"
      draggable
      onDragStart={(e) => handleDragStart(e, node.type)}
      onClick={() => onNodeSelect?.(node.id)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md border ${getCategoryColor(node.category)}`}>
          {node.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium truncate">{node.name}</h4>
            {node.popular && (
              <Badge variant="secondary" className="text-xs">Popular</Badge>
            )}
            {node.new && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">New</Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {node.description}
          </p>
          
          <div className="flex flex-wrap gap-1">
            {node.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {node.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{node.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Grip className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-80 bg-gray-50 border-r flex flex-col ${className}`}>
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold mb-3">Node Palette</h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as NodeCategory | 'all')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="trigger" className="text-xs">Triggers</TabsTrigger>
            <TabsTrigger value="action" className="text-xs">Actions</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Node List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Array.from(nodesByCategory.entries()).map(([category, nodes]) => (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 w-full text-left p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {getCategoryIcon(category)}
                <span className="font-medium capitalize">{category}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {nodes.length}
                </Badge>
              </button>

              {expandedCategories.has(category) && (
                <div className="mt-2 space-y-2 pl-4">
                  {nodes.map(renderNodeItem)}
                </div>
              )}
            </div>
          ))}

          {filteredNodes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No nodes found</p>
              <p className="text-xs text-gray-400">Try adjusting your search</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-white">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Node
        </Button>
      </div>
    </div>
  );
};

export default WorkflowSidebar;