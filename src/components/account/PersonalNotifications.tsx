import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { User } from "@/store/slices/authSlice";
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings
} from "lucide-react";

interface PersonalNotificationsProps {
  user: User;
}

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  category: 'security' | 'activity' | 'updates' | 'marketing';
}

export const PersonalNotifications: React.FC<PersonalNotificationsProps> = ({ user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: "security-alerts",
      title: "Security Alerts",
      description: "Important security notifications and login alerts",
      email: true,
      push: true,
      sms: true,
      category: "security"
    },
    {
      id: "account-activity",
      title: "Account Activity",
      description: "Updates about your account and profile changes",
      email: true,
      push: false,
      sms: false,
      category: "activity"
    },
    {
      id: "system-updates",
      title: "System Updates",
      description: "Platform updates, maintenance notifications, and new features",
      email: true,
      push: true,
      sms: false,
      category: "updates"
    },
    {
      id: "organization-invites",
      title: "Organization Invites",
      description: "Invitations to join organizations and teams",
      email: true,
      push: true,
      sms: false,
      category: "activity"
    },
    {
      id: "deployment-status",
      title: "Deployment Status",
      description: "Contract deployment success and failure notifications",
      email: true,
      push: true,
      sms: false,
      category: "activity"
    },
    {
      id: "weekly-digest",
      title: "Weekly Digest",
      description: "Weekly summary of your platform activity and insights",
      email: true,
      push: false,
      sms: false,
      category: "updates"
    },
    {
      id: "marketing-updates",
      title: "Product Updates & Tips",
      description: "New features, tips, and platform improvement announcements",
      email: false,
      push: false,
      sms: false,
      category: "marketing"
    }
  ]);

  const updateNotificationSetting = (id: string, channel: 'email' | 'push' | 'sms', value: boolean) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, [channel]: value }
          : notification
      )
    );
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    
    try {
      // In a real app, this would be an API call to save notification preferences
      console.log("Saving notification settings:", notifications);
      
      toast({
        title: "Notification Settings Updated",
        description: "Your notification preferences have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'activity':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'updates':
        return <Info className="h-4 w-4 text-green-500" />;
      case 'marketing':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'security':
        return 'Security & Privacy';
      case 'activity':
        return 'Account Activity';
      case 'updates':
        return 'Platform Updates';
      case 'marketing':
        return 'Marketing & Tips';
      default:
        return 'Other';
    }
  };

  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (!acc[notification.category]) {
      acc[notification.category] = [];
    }
    acc[notification.category].push(notification);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  return (
    <div className="space-y-6">
      {/* Notification Channels Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure how you want to receive notifications across different channels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Mail className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">Email</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Smartphone className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Push Notifications</div>
                <div className="text-sm text-muted-foreground">Browser & Mobile</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-medium">SMS</div>
                <div className="text-sm text-muted-foreground">Not configured</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings by Category */}
      {Object.entries(groupedNotifications).map(([category, categoryNotifications]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getCategoryIcon(category)}
              {getCategoryTitle(category)}
            </CardTitle>
            <CardDescription>
              Manage notifications for {getCategoryTitle(category).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-6">Notification Type</div>
                <div className="col-span-2 text-center">Email</div>
                <div className="col-span-2 text-center">Push</div>
                <div className="col-span-2 text-center">SMS</div>
              </div>

              {/* Notification Rows */}
              {categoryNotifications.map((notification) => (
                <div key={notification.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6">
                    <div className="font-medium">{notification.title}</div>
                    <div className="text-sm text-muted-foreground">{notification.description}</div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Switch
                      checked={notification.email}
                      onCheckedChange={(checked) => updateNotificationSetting(notification.id, 'email', checked)}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Switch
                      checked={notification.push}
                      onCheckedChange={(checked) => updateNotificationSetting(notification.id, 'push', checked)}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Switch
                      checked={notification.sms}
                      onCheckedChange={(checked) => updateNotificationSetting(notification.id, 'sms', checked)}
                      disabled={true} // SMS not configured
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Notification Settings"}
        </Button>
      </div>
    </div>
  );
};

export default PersonalNotifications;