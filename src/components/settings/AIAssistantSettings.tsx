import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bot, Settings, Shield, Database, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { aiAssistantApi } from '@/services/api/aiAssistant';

interface AIAssistantSettings {
  // Provider Settings
  preferredProvider: 'deepseek' | 'anthropic' | 'openai' | 'auto';
  fallbackProvider: 'deepseek' | 'anthropic' | 'openai' | 'none';
  
  // Model Settings
  deepseekModel: string;
  anthropicModel: string;
  openaiModel: string;
  temperature: number;
  maxTokens: number;
  
  // Conversation Settings
  autoSaveConversations: boolean;
  historyRetentionDays: number;
  maxConversationLength: number;
  contextMemoryEnabled: boolean;
  
  // Action Settings
  requireActionConfirmation: boolean;
  autoExecuteSafeActions: boolean;
  allowedActionCategories: string[];
  
  // Privacy Settings
  dataSharing: boolean;
  conversationLogging: boolean;
  analyticsOptIn: boolean;
}

const defaultSettings: AIAssistantSettings = {
  preferredProvider: 'deepseek',
  fallbackProvider: 'anthropic',
  deepseekModel: 'deepseek-chat',
  anthropicModel: 'claude-3-sonnet-20240229',
  openaiModel: 'gpt-4-turbo-preview',
  temperature: 0.7,
  maxTokens: 4000,
  autoSaveConversations: true,
  historyRetentionDays: 30,
  maxConversationLength: 50,
  contextMemoryEnabled: true,
  requireActionConfirmation: true,
  autoExecuteSafeActions: false,
  allowedActionCategories: ['read', 'search'],
  dataSharing: false,
  conversationLogging: true,
  analyticsOptIn: false
};

const actionCategories = [
  { id: 'read', label: 'Read Data', description: 'View and retrieve information' },
  { id: 'search', label: 'Search', description: 'Search through data and content' },
  { id: 'create', label: 'Create Records', description: 'Create new data records' },
  { id: 'update', label: 'Update Records', description: 'Modify existing data' },
  { id: 'delete', label: 'Delete Records', description: 'Remove data (requires confirmation)' },
  { id: 'admin', label: 'Administrative', description: 'System administration tasks' }
];

export default function AIAssistantSettings() {
  const [settings, setSettings] = useState<AIAssistantSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await aiAssistantApi.getAIAssistantSettings();
      if (response.success && response.data) {
        setSettings({ ...defaultSettings, ...response.data });
      }
    } catch (error) {
      console.error('Failed to load AI assistant settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI assistant settings. Using defaults.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await aiAssistantApi.updateAIAssistantSettings(settings);
      if (response.success) {
        setHasChanges(false);
        toast({
          title: 'Success',
          description: 'AI assistant settings saved successfully.'
        });
      } else {
        throw new Error(response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save AI assistant settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI assistant settings.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof AIAssistantSettings>(
    key: K,
    value: AIAssistantSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleActionCategory = (categoryId: string) => {
    const newCategories = settings.allowedActionCategories.includes(categoryId)
      ? settings.allowedActionCategories.filter(id => id !== categoryId)
      : [...settings.allowedActionCategories, categoryId];
    updateSetting('allowedActionCategories', newCategories);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Assistant Settings</h2>
          <p className="text-muted-foreground">
            Configure your AI assistant preferences and behavior
          </p>
        </div>
        <Button 
          onClick={saveSettings} 
          disabled={!hasChanges || saving}
          className="min-w-[100px]"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Provider Settings
          </CardTitle>
          <CardDescription>
            Configure which AI providers to use and fallback options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredProvider">Preferred Provider</Label>
              <Select
                value={settings.preferredProvider}
                onValueChange={(value: any) => updateSetting('preferredProvider', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">Deepseek (Most Cost-Effective)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="auto">Auto-select</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fallbackProvider">Fallback Provider</Label>
              <Select
                value={settings.fallbackProvider}
                onValueChange={(value: any) => updateSetting('fallbackProvider', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek">Deepseek (Most Cost-Effective)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deepseekModel">Deepseek Model</Label>
              <Select
                value={settings.deepseekModel}
                onValueChange={(value) => updateSetting('deepseekModel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepseek-chat">Deepseek Chat</SelectItem>
                  <SelectItem value="deepseek-coder">Deepseek Coder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anthropicModel">Anthropic Model</Label>
              <Select
                value={settings.anthropicModel}
                onValueChange={(value) => updateSetting('anthropicModel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku</SelectItem>
                  <SelectItem value="claude-3-opus-20240229">Claude 3 Opus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openaiModel">OpenAI Model</Label>
              <Select
                value={settings.openaiModel}
                onValueChange={(value) => updateSetting('openaiModel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4-turbo-preview">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature: {settings.temperature}
              </Label>
              <Slider
                value={[settings.temperature]}
                onValueChange={([value]) => updateSetting('temperature', value)}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values make responses more focused and deterministic
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                type="number"
                value={settings.maxTokens}
                onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                min={100}
                max={4000}
              />
              <p className="text-xs text-muted-foreground">
                Maximum length of AI responses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Conversation Settings
          </CardTitle>
          <CardDescription>
            Manage how conversations are stored and handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-save Conversations</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save conversation history
              </p>
            </div>
            <Switch
              checked={settings.autoSaveConversations}
              onCheckedChange={(checked) => updateSetting('autoSaveConversations', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Context Memory</Label>
              <p className="text-sm text-muted-foreground">
                Remember context across conversations
              </p>
            </div>
            <Switch
              checked={settings.contextMemoryEnabled}
              onCheckedChange={(checked) => updateSetting('contextMemoryEnabled', checked)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="historyRetentionDays">History Retention (days)</Label>
              <Input
                type="number"
                value={settings.historyRetentionDays}
                onChange={(e) => updateSetting('historyRetentionDays', parseInt(e.target.value))}
                min={1}
                max={365}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxConversationLength">Max Conversation Length</Label>
              <Input
                type="number"
                value={settings.maxConversationLength}
                onChange={(e) => updateSetting('maxConversationLength', parseInt(e.target.value))}
                min={10}
                max={200}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Action Settings
          </CardTitle>
          <CardDescription>
            Control what actions the AI assistant can perform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Action Confirmation</Label>
              <p className="text-sm text-muted-foreground">
                Ask for confirmation before executing actions
              </p>
            </div>
            <Switch
              checked={settings.requireActionConfirmation}
              onCheckedChange={(checked) => updateSetting('requireActionConfirmation', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-execute Safe Actions</Label>
              <p className="text-sm text-muted-foreground">
                Automatically run read-only and safe actions
              </p>
            </div>
            <Switch
              checked={settings.autoExecuteSafeActions}
              onCheckedChange={(checked) => updateSetting('autoExecuteSafeActions', checked)}
            />
          </div>

          <div className="space-y-3">
            <Label>Allowed Action Categories</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionCategories.map((category) => (
                <div
                  key={category.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    settings.allowedActionCategories.includes(category.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleActionCategory(category.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{category.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {category.description}
                      </div>
                    </div>
                    {settings.allowedActionCategories.includes(category.id) && (
                      <Badge variant="secondary">Enabled</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control data sharing and privacy preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Conversation Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log conversations for debugging and improvement
              </p>
            </div>
            <Switch
              checked={settings.conversationLogging}
              onCheckedChange={(checked) => updateSetting('conversationLogging', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Data Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Share anonymized data to improve AI models
              </p>
            </div>
            <Switch
              checked={settings.dataSharing}
              onCheckedChange={(checked) => updateSetting('dataSharing', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Analytics Opt-in</Label>
              <p className="text-sm text-muted-foreground">
                Allow usage analytics for feature improvement
              </p>
            </div>
            <Switch
              checked={settings.analyticsOptIn}
              onCheckedChange={(checked) => updateSetting('analyticsOptIn', checked)}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your privacy is important to us. All data is encrypted and never shared with third parties without your explicit consent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Changes Footer */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800">
                  You have unsaved changes
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    loadSettings();
                    setHasChanges(false);
                  }}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}