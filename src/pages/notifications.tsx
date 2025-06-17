import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  fetchNotifications,
  markNotificationAsReadAsync,
  markAllNotificationsAsReadAsync,
  Notification,
  NotificationType,
  NotificationPriority,
  clearNotificationErrors, // Added clearNotificationErrors
} from "@/store/slices/notificationSlice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellRing, CheckCheck, Bell, ShieldAlert, BarChart, MessageSquare, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import NextLink from "next/link";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { usePageController } from "@/hooks/usePageController";
import { Alert, AlertDescription } from "@/components/ui/alert";

const NotificationsPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, isLoading, notificationError } = useAppSelector((state) => state.notification);
  const [activeTab, setActiveTab] = useState<NotificationType | "all">("all");
  const [controllerNotifications, setControllerNotifications] = useState<any[]>([]);
  const [isControllerLoading, setIsControllerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canRead = hasPermission('notifications:read');
  const canWrite = hasPermission('notifications:write');

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'notifications',
    pageName: 'Notifications',
    description: 'Manage system notifications and alerts',
    category: 'communication',
    permissions: ['notifications:read', 'notifications:write'],
    tags: ['notifications', 'alerts', 'communication', 'system']
  });
  
  // Load notifications from controller
  const loadNotifications = async () => {
    if (!pageController.isRegistered || !canRead) return;
    
    setIsControllerLoading(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('fetchNotifications', { includeRead: true });
      
      if (result.success && result.data) {
        const notificationsData = result.data as { notifications: any[] };
        setControllerNotifications(notificationsData.notifications || []);
        toast({
          title: "Notifications loaded",
          description: "Notifications loaded successfully",
        });
      } else {
        setError(result.error || 'Failed to load notifications');
        toast({
          title: "Error loading notifications",
          description: result.error || 'Failed to load notifications',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
      toast({
        title: "Error loading notifications",
        description: 'Failed to load notifications',
        variant: "destructive",
      });
    } finally {
      setIsControllerLoading(false);
    }
  };

  useEffect(() => {
    if (pageController.isRegistered && canRead) {
      loadNotifications();
    }
  }, [pageController.isRegistered, canRead]);

  useEffect(() => {
    // Keep Redux calls for backward compatibility
    if (canRead) {
      dispatch(fetchNotifications({}));
      dispatch(clearNotificationErrors());
    }
  }, [canRead]);

  useEffect(() => {
    if (notificationError) {
      toast({
        title: "Notification Error",
        description: notificationError,
        variant: "destructive",
      });
      dispatch(clearNotificationErrors());
    }
  }, [notificationError, toast, dispatch]);


  // Use controller notifications if available, fallback to Redux notifications
  const allNotifications = controllerNotifications.length > 0 ? controllerNotifications : notifications;
  
  const filteredNotifications = activeTab === "all"
    ? allNotifications
    : allNotifications.filter(notif => notif.type === activeTab);
  
  const handleMarkAllAsRead = async () => {
    if (!canWrite) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to mark notifications as read",
        variant: "destructive",
      });
      return;
    }

    if (pageController.isRegistered) {
      try {
        const result = await pageController.executeAction('markAllAsRead', {});
        
        if (result.success) {
          toast({
            title: "All notifications marked as read",
            description: "All notifications marked as read",
          });
          await loadNotifications(); // Refresh notifications
        } else {
          toast({
            title: "Error marking notifications as read",
            description: result.error || 'Failed to mark notifications as read',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        toast({
          title: "Error marking notifications as read",
          description: 'Failed to mark notifications as read',
          variant: "destructive",
        });
      }
    }

    // Also keep Redux call for backward compatibility
    try {
      await dispatch(markAllNotificationsAsReadAsync("all")).unwrap();
      toast({
        title: "All Notifications Marked as Read",
        description: "All unread notifications have been marked as read.",
      });
    } catch (error) {
      // Error handled by useEffect
    }
  };

  const handleRefreshNotifications = async () => {
    await loadNotifications();
  };
  
  const getNotificationIcon = (type: NotificationType, size = 16) => {
    switch (type) {
      case "system": return <BellRing size={size} />;
      case "security": return <ShieldAlert size={size} />;
      case "usage": return <BarChart size={size} />;
      case "team": return <MessageSquare size={size} />;
      default: return <Bell size={size} />;
    }
  };
  
  const getNotificationBgColor = (type: NotificationType, isRead: boolean) => {
    if (isRead) return "";
    
    switch (type) {
      case "system": return "bg-blue-50";
      case "security": return "bg-red-50";
      case "usage": return "bg-yellow-50";
      case "team": return "bg-green-50";
      default: return "bg-gray-50";
    }
  };
  
  const getPriorityColor = (priority: NotificationPriority) => { // Use NotificationPriority type
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Show permission error if user can't read notifications
  if (!canRead) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated with important alerts and notifications
            </p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view notifications. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with important alerts and notifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefreshNotifications}
            disabled={isControllerLoading}
          >
            {isControllerLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          {canWrite && unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead} disabled={isLoading || isControllerLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="h-4 w-4 mr-2" />}
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                System alerts, security notices, and team messages
              </CardDescription>
            </div>
            {unreadCount > 0 && (
              <div className="bg-primary/10 text-primary text-sm font-medium rounded-full px-3 py-1">
                {unreadCount} unread
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationType | "all")}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-10 w-10 text-muted-foreground mx-auto mb-4 animate-spin" /> {/* Used Loader2 */}
                  <p>Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="font-medium mb-1">No notifications</p>
                  <p className="text-sm text-muted-foreground">
                    You don't have any {activeTab !== "all" ? activeTab : ""} notifications at the moment
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer", // Added cursor-pointer
                        !notification.isRead && getNotificationBgColor(notification.type, notification.isRead)
                      )}
                      onClick={() => canWrite && !notification.isRead && dispatch(markNotificationAsReadAsync(notification.id))}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "rounded-full p-2",
                          getNotificationBgColor(notification.type, notification.isRead) // Use function to get color safely
                        )}>
                          {getNotificationIcon(notification.type, 20)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className={cn("font-medium", !notification.isRead && "font-semibold")}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.createdAt), "MMM d, h:mm a")} {/* Changed timestamp to createdAt */}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{notification.message}</p>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              {notification.actionUrl && (
                                <Button variant="link" className="p-0 h-auto" asChild>
                                  <NextLink href={notification.actionUrl}>
                                    {notification.actionLabel || "View Details"}
                                  </NextLink>
                                </Button>
                              )}
                            </div>
                            <span className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                              getPriorityColor(notification.priority)
                            )}>
                              {notification.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;