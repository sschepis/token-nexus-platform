
import React, { useEffect, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { 
  fetchNotificationsStart, 
  fetchNotificationsSuccess, 
  markAsRead, 
  markAllAsRead,
  deleteNotification,
  Notification,
  NotificationType,
  NotificationPriority
} from "@/store/slices/notificationSlice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, X, BellRing, ShieldAlert, BarChart, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { mockApis } from "@/services/api";

const NotificationCenter = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, isLoading } = useAppSelector(
    (state) => state.notification
  );
  const [activeTab, setActiveTab] = useState<NotificationType | "all">("all");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {
    if (isOpen && !notifications.length) {
      dispatch(fetchNotificationsStart());
      
      // Mock notifications data - in a real app, this would be an API call
      const mockNotifications: Notification[] = [
        {
          id: "notif-1",
          type: "system",
          title: "System Maintenance",
          message: "Scheduled maintenance will occur tomorrow at 2:00 AM UTC.",
          timestamp: new Date(Date.now() + 86400000).toISOString(),
          isRead: false,
          priority: "normal" as NotificationPriority,
          userId: "user-123",
        },
        {
          id: "notif-2",
          type: "security",
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
          type: "usage",
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
          type: "team",
          title: "New Team Member",
          message: "Jane Smith accepted your invitation to join the team.",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isRead: true,
          priority: "normal" as NotificationPriority,
          userId: "user-123",
        },
        {
          id: "notif-5",
          type: "system",
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
  }, [dispatch, isOpen, notifications.length]);

  // Filter notifications based on active tab
  const filteredNotifications = activeTab === "all" 
    ? notifications 
    : notifications.filter(notif => notif.type === activeTab);

  // Handle marking a notification as read
  const handleMarkAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = () => {
    dispatch(markAllAsRead());
  };

  // Handle deleting a notification
  const handleDeleteNotification = (id: string) => {
    dispatch(deleteNotification(id));
  };

  // Get priority classes
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "urgent": return "border-l-4 border-red-500";
      case "high": return "border-l-4 border-orange-500";
      case "normal": return "border-l-4 border-blue-500";
      case "low": return "border-l-4 border-gray-500";
      default: return "";
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "system": return <BellRing className="h-4 w-4" />;
      case "security": return <ShieldAlert className="h-4 w-4" />;
      case "usage": return <BarChart className="h-4 w-4" />;
      case "team": return <MessageSquare className="h-4 w-4" />;
      default: return <BellRing className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs px-2"
              onClick={handleMarkAllAsRead}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as NotificationType | "all")}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
            <TabsTrigger value="usage" className="text-xs">Usage</TabsTrigger>
            <TabsTrigger value="team" className="text-xs">Team</TabsTrigger>
          </TabsList>
        
          <ScrollArea className="h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <Bell className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground">
                  When you receive notifications, they'll appear here
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                    !notification.isRead && "bg-muted/30",
                    getPriorityClass(notification.priority)
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={cn(
                        "rounded-full p-1",
                        notification.priority === "high" || notification.priority === "urgent" 
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div>
                        <h4 className={cn(
                          "text-sm font-medium",
                          !notification.isRead && "font-semibold"
                        )}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            className="text-xs text-primary font-medium mt-2 inline-block"
                          >
                            {notification.actionLabel || "View Details"}
                          </a>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDeleteNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          
          <div className="p-2 border-t text-center">
            <Button variant="link" size="sm" className="text-xs" asChild>
              <a href="/notifications">View All Notifications</a>
            </Button>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
