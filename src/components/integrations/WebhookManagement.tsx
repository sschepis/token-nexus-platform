import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from 'next/dynamic';
const MultiSelect = dynamic(() => import('@/components/ui/multi-select').then(mod => mod.MultiSelect), {
  ssr: false,
  loading: () => <div>Loading MultiSelect...</div>
});

import { WebhookIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  Webhook,
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  clearErrors,
} from "@/store/slices/integrationSlice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

const availableWebhookEvents = [
  { label: "User Created", value: "user.created" },
  { label: "User Updated", value: "user.updated" },
  { label: "User Deleted", value: "user.deleted" },
  { label: "Token Created", value: "token.created" },
  { label: "Token Updated", value: "token.updated" },
  { label: "Token Transferred", value: "token.transferred" },
  { label: "Organization Updated", value: "organization.updated" },
  { label: "Organization Member Added", value: "organization.member_added" },
  { label: "Organization Member Removed", value: "organization.member_removed" },
  { label: "Audit Log Created", value: "audit.log_created" },
  { label: "Notification Sent", value: "notification.sent" },
  { label: "Integration Created", value: "integration.created" },
  { label: "Integration Updated", value: "integration.updated" },
  { label: "Integration Deleted", value: "integration.deleted" },
  { label: "Webhook Test", value: "webhook.test" }, // This might be a test event
];

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const WebhookManagement: React.FC = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const {
    webhooks,
    isLoadingWebhooks,
    webhookError,
    isCreating,
    isUpdating,
    isDeleting,
    isTesting,
  } = useAppSelector((state) => state.integration);

  // Local state for forms
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookMethod, setNewWebhookMethod] = useState("POST");

  const [confirmDeleteWebhookId, setConfirmDeleteWebhookId] = useState<string | null>(null);
  const [editWebhookId, setEditWebhookId] = useState<string | null>(null);
  const [editWebhookName, setEditWebhookName] = useState("");
  const [editWebhookUrl, setEditWebhookUrl] = useState("");
  const [editWebhookEvents, setEditWebhookEvents] = useState<string[]>([]);
  const [editWebhookMethod, setEditWebhookMethod] = useState("");

  useEffect(() => {
    dispatch(fetchWebhooks({}));
  }, [dispatch]);

  // Effect to display and clear errors
  useEffect(() => {
    if (webhookError) {
      toast({
        title: "Webhook Error",
        description: webhookError,
        variant: "destructive",
      });
      dispatch(clearErrors());
    }
  }, [webhookError, toast, dispatch]);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Name, URL, Events).",
        variant: "destructive",
      });
      return;
    }
    await dispatch(createWebhook({
      name: newWebhookName,
      url: newWebhookUrl,
      events: newWebhookEvents,
      method: newWebhookMethod as "GET" | "POST" | "PUT" | "DELETE",
    }));
    toast({
      title: "Webhook Created",
      description: "Your webhook has been created successfully.",
    });
    setNewWebhookName("");
    setNewWebhookUrl("");
    setNewWebhookEvents([]);
    setNewWebhookMethod("POST");
  };

  const handleEditWebhook = (webhook: Webhook) => {
    setEditWebhookId(webhook.id);
    setEditWebhookName(webhook.name);
    setEditWebhookUrl(webhook.url);
    setEditWebhookEvents(webhook.events);
    setEditWebhookMethod(webhook.method || "POST");
  };

  const handleUpdateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWebhookId) return;

    await dispatch(updateWebhook({
      webhookId: editWebhookId,
      name: editWebhookName,
      url: editWebhookUrl,
      events: editWebhookEvents,
      method: editWebhookMethod as "GET" | "POST" | "PUT" | "DELETE",
    }));
    toast({
      title: "Webhook Updated",
      description: "Webhook details updated successfully.",
    });
    setEditWebhookId(null);
  };

  const handleToggleWebhook = async (id: string, currentStatus: boolean) => {
    await dispatch(updateWebhook({ webhookId: id, isActive: !currentStatus }));
    toast({
      title: "Webhook Status Updated",
      description: `Webhook has been ${!currentStatus ? "enabled" : "disabled"} successfully.`,
    });
  };

  const handleDeleteWebhook = async (id: string) => {
    setConfirmDeleteWebhookId(null);
    await dispatch(deleteWebhook(id));
    toast({
      title: "Webhook Deleted",
      description: "Webhook has been deleted successfully.",
    });
  };

  const handleTestWebhook = async (id: string) => {
    await dispatch(testWebhook(id));
    toast({
      title: "Webhook Test Sent",
      description: "A test payload has been sent to your webhook.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>
          HTTP callbacks to notify external services about events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="w-[150px]">Events</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingWebhooks ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> Loading Webhooks...
                </TableCell>
              </TableRow>
            ) : webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No webhooks configured yet.
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell>{webhook.url}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <span key={event} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {event}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{webhook.method}</TableCell>
                  <TableCell>
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={(checked) => handleToggleWebhook(webhook.id, webhook.isActive)}
                      aria-label="Toggle webhook status"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditWebhook(webhook)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleTestWebhook(webhook.id)} className="ml-2">Test</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 ml-2" // Used className instead of variant
                      onClick={() => setConfirmDeleteWebhookId(webhook.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-6 p-4 border rounded-md bg-muted">
          <h3 className="text-lg font-semibold mb-3">Create New Webhook</h3>
          <form onSubmit={handleCreateWebhook} className="space-y-4">
            <div>
              <Label htmlFor="webhookName" className="mb-1 block">Name</Label>
              <Input
                id="webhookName"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                placeholder="Marketing Webhook"
              />
            </div>
            <div>
              <Label htmlFor="webhookUrl" className="mb-1 block">URL</Label>
              <Input
                id="webhookUrl"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://api.example.com/webhook-receiver"
              />
            </div>
            <div>
              <Label htmlFor="webhookEvents" className="mb-1 block">Events</Label>
              {MultiSelect && (
                <MultiSelect
                  options={availableWebhookEvents}
                  value={newWebhookEvents}
                  onValueChange={setNewWebhookEvents}
                  placeholder="Select events..."
                />
              )}
            </div>
            <div>
              <Label htmlFor="webhookMethod" className="mb-1 block">Method</Label>
              <Select value={newWebhookMethod} onValueChange={setNewWebhookMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create Webhook
            </Button>
          </form>
        </div>
      </CardContent>

      <AlertDialog open={!!confirmDeleteWebhookId} onOpenChange={(open) => setConfirmDeleteWebhookId(open ? confirmDeleteWebhookId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your webhook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground" // Used className instead of variant
              onClick={() => confirmDeleteWebhookId && handleDeleteWebhook(confirmDeleteWebhookId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editWebhookId} onOpenChange={(open) => setEditWebhookId(open ? editWebhookId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Modify the details of your webhook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleUpdateWebhook} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editWebhookName" className="mb-1 block">Name</Label>
              <Input
                id="editWebhookName"
                value={editWebhookName}
                onChange={(e) => setEditWebhookName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editWebhookUrl" className="mb-1 block">URL</Label>
              <Input
                id="editWebhookUrl"
                value={editWebhookUrl}
                onChange={(e) => setEditWebhookUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editWebhookEvents" className="mb-1 block">Events</Label>
              {MultiSelect && (
                <MultiSelect
                  options={availableWebhookEvents}
                  value={editWebhookEvents}
                  onValueChange={setEditWebhookEvents}
                  placeholder="Select events..."
                />
              )}
            </div>
            <div>
              <Label htmlFor="editWebhookMethod" className="mb-1 block">Method</Label>
              <Select value={editWebhookMethod} onValueChange={setEditWebhookMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditWebhookId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};