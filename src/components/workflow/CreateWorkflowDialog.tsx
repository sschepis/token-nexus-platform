import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Workflow, 
  Users, 
  Database, 
  Bell, 
  Zap, 
  GitBranch,
  Clock,
  Mail,
  Webhook,
  Bot,
  FileText,
  Settings
} from "lucide-react";
import { CreateWorkflowRequest, WorkflowTemplate } from "@/types/workflows";

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkflow: (workflow: CreateWorkflowRequest) => Promise<void>;
  templates: WorkflowTemplate[];
}

const defaultTemplates: WorkflowTemplate[] = [
  {
    id: "user-onboarding",
    name: "User Onboarding",
    description: "Automate new user welcome emails, profile setup, and initial data collection",
    category: "user-management",
    icon: "Users",
    tags: ["onboarding", "email", "user-management"],
    nodes: [
      {
        id: "trigger-1",
        type: "parse-trigger",
        category: "trigger",
        name: "New User Registered",
        position: { x: 100, y: 100 },
        data: {
          label: "New User Registered",
          config: {
            triggerType: "user.created",
            className: "User",
            triggerEvent: "afterSave"
          }
        }
      },
      {
        id: "action-1",
        type: "email-action",
        category: "action",
        name: "Send Welcome Email",
        position: { x: 300, y: 100 },
        data: {
          label: "Send Welcome Email",
          config: {
            actionType: "email.send",
            template: "welcome",
            to: "{{user.email}}"
          }
        }
      }
    ],
    edges: [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "action-1",
        type: "default"
      }
    ]
  },
  {
    id: "data-sync",
    name: "Data Synchronization",
    description: "Sync data between Parse Server and external services when records are updated",
    category: "data-processing",
    icon: "Database",
    tags: ["sync", "data", "integration"],
    nodes: [
      {
        id: "trigger-1",
        type: "parse-trigger",
        category: "trigger",
        name: "Record Updated",
        position: { x: 100, y: 100 },
        data: {
          label: "Record Updated",
          config: {
            triggerType: "object.updated",
            className: "UserProfile",
            triggerEvent: "afterSave"
          }
        }
      },
      {
        id: "action-1",
        type: "api-action",
        category: "action",
        name: "Sync to External API",
        position: { x: 300, y: 100 },
        data: {
          label: "Sync to External API",
          config: {
            actionType: "http.request",
            method: "POST",
            url: "https://api.external.com/sync",
            body: "{{object}}"
          }
        }
      }
    ],
    edges: [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "action-1",
        type: "default"
      }
    ]
  },
  {
    id: "notification-system",
    name: "Smart Notifications",
    description: "Send intelligent notifications based on user activity and preferences",
    category: "notification",
    icon: "Bell",
    tags: ["notifications", "ai", "personalization"],
    nodes: [
      {
        id: "trigger-1",
        type: "webhook-trigger",
        category: "trigger",
        name: "User Activity",
        position: { x: 100, y: 100 },
        data: {
          label: "User Activity",
          config: {
            triggerType: "user.activity",
            webhookUrl: "/webhooks/user-activity"
          }
        }
      },
      {
        id: "condition-1",
        type: "condition-logic",
        category: "logic",
        name: "Check Preferences",
        position: { x: 300, y: 100 },
        data: {
          label: "Check Preferences",
          config: {
            logicType: "condition",
            condition: "user.preferences.notifications === true"
          }
        }
      },
      {
        id: "action-1",
        type: "notification-action",
        category: "action",
        name: "Send Notification",
        position: { x: 500, y: 100 },
        data: {
          label: "Send Notification",
          config: {
            actionType: "notification.send",
            type: "push",
            message: "{{activity.message}}"
          }
        }
      }
    ],
    edges: [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "condition-1",
        type: "default"
      },
      {
        id: "edge-2",
        source: "condition-1",
        target: "action-1",
        type: "conditional",
        data: { condition: "true" }
      }
    ]
  },
  {
    id: "ai-assistant-workflow",
    name: "AI Assistant Integration",
    description: "Integrate AI assistant responses with workflow automation",
    category: "integration",
    icon: "Bot",
    tags: ["ai", "assistant", "automation"],
    nodes: [
      {
        id: "trigger-1",
        type: "webhook-trigger",
        category: "trigger",
        name: "AI Request",
        position: { x: 100, y: 100 },
        data: {
          label: "AI Request",
          config: {
            triggerType: "ai.request",
            webhookUrl: "/webhooks/ai-request"
          }
        }
      },
      {
        id: "action-1",
        type: "ai-action",
        category: "action",
        name: "Process with AI",
        position: { x: 300, y: 100 },
        data: {
          label: "Process with AI",
          config: {
            actionType: "ai.process",
            model: "gpt-4",
            prompt: "{{request.prompt}}"
          }
        }
      },
      {
        id: "action-2",
        type: "workflow-action",
        category: "action",
        name: "Execute Action",
        position: { x: 500, y: 100 },
        data: {
          label: "Execute Action",
          config: {
            actionType: "workflow.execute",
            workflowId: "{{ai.response.workflowId}}"
          }
        }
      }
    ],
    edges: [
      {
        id: "edge-1",
        source: "trigger-1",
        target: "action-1",
        type: "default"
      },
      {
        id: "edge-2",
        source: "action-1",
        target: "action-2",
        type: "default"
      }
    ]
  }
];

const getTemplateIcon = (iconName: string) => {
  const icons: Record<string, React.ComponentType<any>> = {
    Users,
    Database,
    Bell,
    Zap,
    GitBranch,
    Clock,
    Mail,
    Webhook,
    Bot,
    FileText,
    Settings,
    Workflow
  };
  
  const IconComponent = icons[iconName] || Workflow;
  return <IconComponent className="h-5 w-5" />;
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'user-management':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'data-processing':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'notification':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'integration':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({
  open,
  onOpenChange,
  onCreateWorkflow,
  templates: providedTemplates = []
}) => {
  const [activeTab, setActiveTab] = useState("scratch");
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    tags: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  // Use provided templates or fall back to defaults
  const allTemplates = providedTemplates.length > 0 ? providedTemplates : defaultTemplates;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags.join(", ")
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const workflowData: CreateWorkflowRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        nodes: selectedTemplate?.nodes || [],
        edges: selectedTemplate?.edges || [],
        metadata: {
          category: formData.category || undefined,
          tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()).filter(Boolean) : undefined,
          templateId: selectedTemplate?.id
        }
      };

      await onCreateWorkflow(workflowData);
      
      // Reset form
      setFormData({ name: "", description: "", category: "", tags: "" });
      setSelectedTemplate(null);
      setActiveTab("scratch");
    } catch (error) {
      console.error('Failed to create workflow:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", category: "", tags: "" });
    setSelectedTemplate(null);
    setActiveTab("scratch");
    onOpenChange(false);
  };

  const isFormValid = formData.name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogDescription>
            Create a workflow from scratch or use a template to get started quickly.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="scratch">From Scratch</TabsTrigger>
            <TabsTrigger value="template">From Template</TabsTrigger>
          </TabsList>

          <TabsContent value="scratch" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Workflow Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter workflow name..."
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this workflow does..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user-management">User Management</SelectItem>
                      <SelectItem value="data-processing">Data Processing</SelectItem>
                      <SelectItem value="notification">Notifications</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="automation">Automation</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    placeholder="tag1, tag2, tag3..."
                    value={formData.tags}
                    onChange={(e) => handleInputChange("tags", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {allTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? 'ring-2 ring-primary border-primary'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        {getTemplateIcon(template.icon)}
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium mt-1 border ${getCategoryColor(template.category)}`}>
                            {template.category.replace('-', ' ')}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm mb-3">
                        {template.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedTemplate && (
                <div className="border-t pt-4 space-y-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="template-name">Workflow Name *</Label>
                      <Input
                        id="template-name"
                        placeholder="Enter workflow name..."
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        placeholder="Customize the description..."
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="template-category">Category</Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user-management">User Management</SelectItem>
                            <SelectItem value="data-processing">Data Processing</SelectItem>
                            <SelectItem value="notification">Notifications</SelectItem>
                            <SelectItem value="integration">Integration</SelectItem>
                            <SelectItem value="automation">Automation</SelectItem>
                            <SelectItem value="monitoring">Monitoring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="template-tags">Tags</Label>
                        <Input
                          id="template-tags"
                          placeholder="tag1, tag2, tag3..."
                          value={formData.tags}
                          onChange={(e) => handleInputChange("tags", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!isFormValid || isCreating}>
            {isCreating ? "Creating..." : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};