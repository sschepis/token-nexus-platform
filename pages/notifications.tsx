import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { 
  fetchNotificationsStart, 
  fetchNotificationsSuccess, 
  markAsRead, 
  markAllAsRead,
  Notification, 
  NotificationType,
  NotificationPriority 
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
import { BellRing, CheckCheck, Bell, ShieldAlert, BarChart, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import NextLink from "next/link"; // Import Next.js Link

const NotificationsPage = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, isLoading } = useAppSelector((state) => state.notification);
  const [activeTab, setActiveTab] = useState<NotificationType | "all">("all");
  
  useEffect(() => {
    if (!notifications.length) {
      dispatch(fetchNotificationsStart());
      const mockNotifications: Notification[] = [
        {
          id: "notif-1",
          type: "system" as NotificationType,
          title: "System Maintenance",
          message: "Scheduled maintenance will occur tomorrow at 2:00 AM UTC.",
          timestamp: new Date(Date.now() + 86400000).toISOString(),
          isRead: false,
          priority: "normal" as NotificationPriority,
          userId: "user-123",
        },
        {
          id: "notif-2",
          type: "security" as NotificationType,
          title: "New Login Detected",
          message: "A new login was detected from Chicago, USA.",
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: "high" as NotificationPriority,
          userId: "user-123",
          actionUrl: "/settings/security",
          actionLabel: "Review Activity",
        },
        {
          id: "notif-3",
          type: "usage" as NotificationType,
          title: "API Usage 80% of Limit",
          message: "Your API usage is approaching your monthly limit.",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isRead: true,
          priority: "high" as NotificationPriority,
          userId: "user-123",
          actionUrl: "/settings/billing",
          actionLabel: "Upgrade Plan",
        },
        {
          id: "notif-4",
          type: "team" as NotificationType,
          title: "New Team Member",
          message: "Jane Smith accepted your invitation to join the team.",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isRead: true,
          priority: "normal" as NotificationPriority,
          userId: "user-123",
        },
        {
          id: "notif-5",
          type: "system" as NotificationType,
          title: "New Feature Available",
          message: "Check out the new dashboard analytics features!",
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          isRead: false,
          priority: "low" as NotificationPriority,
          userId: "user-123",
          actionUrl: "/dashboard",
          actionLabel: "View Dashboard",
        },
      ];
      
      setTimeout(() => {
        dispatch(fetchNotificationsSuccess(mockNotifications));
      }, 500);
    }
  }, [dispatch, notifications.length]);

  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : notifications.filter(notif => notif.type === activeTab);
  
  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
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
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      case "low": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with important alerts and notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        )}
      </div>

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
                  <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
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
                        "p-4 rounded-lg border",
                        !notification.isRead && getNotificationBgColor(notification.type, notification.isRead)
                      )}
                      onClick={() => !notification.isRead && dispatch(markAsRead(notification.id))}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "rounded-full p-2",
                          `bg-${notification.type}-100 text-${notification.type}-700` // This might need adjustment if Tailwind JIT doesn't pick up dynamic class names
                        )}>
                          {getNotificationIcon(notification.type, 20)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className={cn("font-medium", !notification.isRead && "font-semibold")}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(notification.timestamp), "MMM d, h:mm a")}
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