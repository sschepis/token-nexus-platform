
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Slack } from "lucide-react";

interface NotificationSettings {
  lateTaskReminders: boolean;
  dailySummaries: boolean;
  publicPings: boolean;
  alertThreshold: number; // hours
}

const SlackIntegration = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    lateTaskReminders: true,
    dailySummaries: true,
    publicPings: false,
    alertThreshold: 24,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWebhookUrl(e.target.value);
  };

  const handleNotificationToggle = (setting: keyof Omit<NotificationSettings, 'alertThreshold'>) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setNotificationSettings(prev => ({ ...prev, alertThreshold: value }));
  };

  const handleConnect = async () => {
    if (!webhookUrl) {
      toast({
        title: "Missing webhook URL",
        description: "Please enter your Slack webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call to connect to Slack
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConnected(true);
      toast({
        title: "Connected to Slack",
        description: "Slack integration has been configured successfully",
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Could not connect to Slack. Please check your webhook URL.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call to disconnect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsConnected(false);
      setWebhookUrl('');
      
      toast({
        title: "Disconnected from Slack",
        description: "Slack integration has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to disconnect",
        description: "An error occurred while disconnecting from Slack",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsLoading(true);
    
    try {
      // Simulate API call to send test notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Test notification sent",
        description: "Check your Slack channel for the test message",
      });
    } catch (error) {
      toast({
        title: "Failed to send notification",
        description: "Could not send test notification to Slack",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center">
          <Slack className="h-5 w-5 mr-2" />
          <CardTitle>Slack Integration</CardTitle>
        </div>
        <CardDescription>
          Connect to Slack for automated notifications and team updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Connected to Slack</AlertTitle>
              <AlertDescription className="text-green-700">
                Slack notifications are configured and active.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="lateTaskReminders">Late Task Reminders</Label>
                    <p className="text-sm text-muted-foreground">Send reminders for tasks past due date</p>
                  </div>
                  <Switch
                    id="lateTaskReminders"
                    checked={notificationSettings.lateTaskReminders}
                    onCheckedChange={() => handleNotificationToggle('lateTaskReminders')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dailySummaries">Daily Summaries</Label>
                    <p className="text-sm text-muted-foreground">Send daily project status updates</p>
                  </div>
                  <Switch
                    id="dailySummaries"
                    checked={notificationSettings.dailySummaries}
                    onCheckedChange={() => handleNotificationToggle('dailySummaries')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="publicPings">Public Pings for Overdue Items</Label>
                    <p className="text-sm text-muted-foreground">Publicly mention assignees for overdue tasks</p>
                  </div>
                  <Switch
                    id="publicPings"
                    checked={notificationSettings.publicPings}
                    onCheckedChange={() => handleNotificationToggle('publicPings')}
                  />
                </div>
                
                <div className="space-y-1 pt-2">
                  <Label htmlFor="alertThreshold">Alert Threshold (hours)</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min="1"
                    max="168"
                    value={notificationSettings.alertThreshold}
                    onChange={handleThresholdChange}
                    className="w-full md:w-1/3"
                  />
                  <p className="text-sm text-muted-foreground">
                    Send alerts when tasks are this many hours overdue
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="webhookUrl">Slack Webhook URL</Label>
              <Input 
                id="webhookUrl"
                placeholder="https://hooks.slack.com/services/..."
                value={webhookUrl}
                onChange={handleInputChange}
              />
              <p className="text-sm text-muted-foreground">
                Create an incoming webhook in your Slack workspace settings
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {isConnected ? (
          <>
            <Button onClick={handleTestNotification} disabled={isLoading}>
              Send Test Notification
            </Button>
            <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
              Disconnect Slack
            </Button>
          </>
        ) : (
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading ? "Connecting..." : "Connect to Slack"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SlackIntegration;
