import React, { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Code2,
  Database,
  Search,
  Trash2,
  Save,
  Play,
  AlertCircle,
  Info,
  Lightbulb,
  X,
  Plus,
} from "lucide-react";
import { CreateTriggerRequest, TriggerType, TriggerCondition } from "@/types/triggers";
import { toast as sonnerToast } from "sonner";

interface CreateTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTrigger: (triggerData: CreateTriggerRequest) => Promise<void>;
}

const TRIGGER_TYPE_INFO = {
  beforeSave: {
    icon: <Database className="h-4 w-4" />,
    color: "text-blue-600 bg-blue-50",
    description: "Executed before an object is saved to the database",
    example: `Parse.Cloud.beforeSave("MyClass", (request) => {
  // Validate or modify the object before saving
  const object = request.object;
  
  if (!object.get("name")) {
    throw new Parse.Error(400, "Name is required");
  }
  
  // Auto-generate slug from name
  object.set("slug", object.get("name").toLowerCase().replace(/\\s+/g, "-"));
});`
  },
  afterSave: {
    icon: <Database className="h-4 w-4" />,
    color: "text-green-600 bg-green-50",
    description: "Executed after an object is successfully saved",
    example: `Parse.Cloud.afterSave("MyClass", async (request) => {
  const object = request.object;
  
  // Send notification after object is created
  if (request.original === undefined) {
    await sendNotification({
      message: \`New \${object.className} created: \${object.get("name")}\`,
      userId: object.get("createdBy")
    });
  }
});`
  },
  beforeDelete: {
    icon: <Trash2 className="h-4 w-4" />,
    color: "text-red-600 bg-red-50",
    description: "Executed before an object is deleted",
    example: `Parse.Cloud.beforeDelete("MyClass", (request) => {
  const object = request.object;
  
  // Prevent deletion if object has dependencies
  if (object.get("hasChildren")) {
    throw new Parse.Error(400, "Cannot delete object with children");
  }
});`
  },
  afterDelete: {
    icon: <Trash2 className="h-4 w-4" />,
    color: "text-orange-600 bg-orange-50",
    description: "Executed after an object is successfully deleted",
    example: `Parse.Cloud.afterDelete("MyClass", async (request) => {
  const object = request.object;
  
  // Clean up related objects
  const relatedQuery = new Parse.Query("RelatedClass");
  relatedQuery.equalTo("parentId", object.id);
  const related = await relatedQuery.find({ useMasterKey: true });
  
  await Parse.Object.destroyAll(related, { useMasterKey: true });
});`
  },
  beforeFind: {
    icon: <Search className="h-4 w-4" />,
    color: "text-purple-600 bg-purple-50",
    description: "Executed before a query is run",
    example: `Parse.Cloud.beforeFind("MyClass", (request) => {
  const query = request.query;
  const user = request.user;
  
  // Add user-specific filters
  if (!user.get("isAdmin")) {
    query.equalTo("createdBy", user);
  }
});`
  },
  afterFind: {
    icon: <Search className="h-4 w-4" />,
    color: "text-indigo-600 bg-indigo-50",
    description: "Executed after a query returns results",
    example: `Parse.Cloud.afterFind("MyClass", (request) => {
  const objects = request.objects;
  
  // Add computed fields to results
  objects.forEach(object => {
    object.set("displayName", \`\${object.get("firstName")} \${object.get("lastName")}\`);
  });
});`
  }
};

const DEFAULT_TRIGGER_CODE = `Parse.Cloud.{triggerType}("{className}", (request) => {
  // Your trigger logic here
  const object = request.object;
  const user = request.user;
  
  // Example: Log the trigger execution
  console.log(\`{triggerType} triggered for \${object.className} with ID: \${object.id}\`);
});`;

export const CreateTriggerDialog: React.FC<CreateTriggerDialogProps> = ({
  open,
  onOpenChange,
  onCreateTrigger,
}) => {
  const { availableClasses } = useAppSelector((state) => state.trigger);
  
  const [formData, setFormData] = useState<CreateTriggerRequest>({
    name: "",
    description: "",
    className: "",
    triggerType: "beforeSave",
    code: "",
    conditions: "",
    tags: []
  });
  
  const [newTag, setNewTag] = useState("");
  const [conditionsList, setConditionsList] = useState<TriggerCondition[]>([]);
  const [newCondition, setNewCondition] = useState<TriggerCondition>({
    field: "",
    operator: "equals",
    value: ""
  });
  const [activeTab, setActiveTab] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update code template when trigger type or class changes
  useEffect(() => {
    if (formData.triggerType && formData.className) {
      const template = DEFAULT_TRIGGER_CODE
        .replace(/{triggerType}/g, formData.triggerType)
        .replace(/{className}/g, formData.className);
      
      setFormData(prev => ({
        ...prev,
        code: template
      }));
    }
  }, [formData.triggerType, formData.className]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      sonnerToast.error("Trigger name is required");
      return;
    }
    
    if (!formData.className) {
      sonnerToast.error("Please select a class");
      return;
    }
    
    if (!formData.code.trim()) {
      sonnerToast.error("Trigger code is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onCreateTrigger(formData);
      onOpenChange(false);
      resetForm();
      sonnerToast.success("Trigger created successfully");
    } catch (error) {
      console.error("Failed to create trigger:", error);
      sonnerToast.error(`Failed to create trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      className: "",
      triggerType: "beforeSave",
      code: "",
      conditions: "",
      tags: []
    });
    setNewTag("");
    setConditionsList([]);
    setNewCondition({ field: "", operator: "equals", value: "" });
    setActiveTab("basic");
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addCondition = () => {
    if (newCondition.field.trim() && newCondition.value.trim()) {
      const updatedConditions = [...conditionsList, { ...newCondition }];
      setConditionsList(updatedConditions);
      
      // Convert conditions array to JSON string for storage
      setFormData(prev => ({
        ...prev,
        conditions: JSON.stringify(updatedConditions)
      }));
      
      setNewCondition({ field: "", operator: "equals", value: "" });
    }
  };

  const removeCondition = (index: number) => {
    const updatedConditions = conditionsList.filter((_, i) => i !== index);
    setConditionsList(updatedConditions);
    
    // Convert conditions array to JSON string for storage
    setFormData(prev => ({
      ...prev,
      conditions: updatedConditions.length > 0 ? JSON.stringify(updatedConditions) : ""
    }));
  };

  const insertCodeExample = () => {
    const triggerInfo = TRIGGER_TYPE_INFO[formData.triggerType];
    if (triggerInfo) {
      setFormData(prev => ({
        ...prev,
        code: triggerInfo.example
      }));
    }
  };

  const currentTriggerInfo = TRIGGER_TYPE_INFO[formData.triggerType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Create New Trigger
          </DialogTitle>
          <DialogDescription>
            Create a new Parse trigger to automatically execute code when events occur on your objects.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="code">Code Editor</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Trigger Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., validateUserData"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="className">Parse Class *</Label>
                  <Select
                    value={formData.className}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, className: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.map((className) => (
                        <SelectItem key={className} value={className}>
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            {className}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerType">Trigger Type *</Label>
                <Select
                  value={formData.triggerType}
                  onValueChange={(value: TriggerType) => setFormData(prev => ({ ...prev, triggerType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_TYPE_INFO).map(([type, info]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          {info.icon}
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentTriggerInfo && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className={`flex items-center gap-2 text-sm ${currentTriggerInfo.color} px-2 py-1 rounded-md w-fit`}>
                      {currentTriggerInfo.icon}
                      {formData.triggerType}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {currentTriggerInfo.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this trigger does..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Trigger Code *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={insertCodeExample}
                  disabled={!formData.triggerType}
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Insert Example
                </Button>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Enter your Parse Cloud Code here..."
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  rows={15}
                  className="font-mono text-sm"
                  required
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  Use Parse Cloud Code syntax. The trigger will be automatically registered.
                </div>
              </div>

              {currentTriggerInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Example Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        <code>{currentTriggerInfo.example}</code>
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Tags</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      placeholder="Add a tag..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1"
                    />
                    <Button type="button" size="sm" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <Label className="text-sm font-medium">Conditions</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional conditions that must be met for the trigger to execute
                  </p>
                  
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <Input
                      placeholder="Field name"
                      value={newCondition.field}
                      onChange={(e) => setNewCondition(prev => ({ ...prev, field: e.target.value }))}
                    />
                    <Select
                      value={newCondition.operator}
                      onValueChange={(value: any) => setNewCondition(prev => ({ ...prev, operator: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="notEquals">Not Equals</SelectItem>
                        <SelectItem value="exists">Exists</SelectItem>
                        <SelectItem value="notExists">Not Exists</SelectItem>
                        <SelectItem value="greaterThan">Greater Than</SelectItem>
                        <SelectItem value="lessThan">Less Than</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={newCondition.value}
                      onChange={(e) => setNewCondition(prev => ({ ...prev, value: e.target.value }))}
                    />
                    <Button type="button" size="sm" onClick={addCondition}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {conditionsList.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {conditionsList.map((condition, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="text-sm">
                            {condition.field} {condition.operator} {condition.value}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCondition(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Trigger
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};