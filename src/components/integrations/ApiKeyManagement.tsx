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
import { Textarea } from "@/components/ui/textarea";
import dynamic from 'next/dynamic';
const MultiSelect = dynamic(() => import('@/components/ui/multi-select').then(mod => mod.MultiSelect), {
  ssr: false,
  loading: () => <div>Loading MultiSelect...</div>
});

import { Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  ApiKey,
  fetchApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  fetchApiKeyUsage,
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

const availableApiKeyScopes = [
  { label: "Read Profile", value: "read:profile" },
  { label: "Write Profile", value: "write:profile" },
  { label: "Read Tokens", value: "read:tokens" },
  { label: "Write Tokens", value: "write:tokens" },
  { label: "Read Organizations", value: "read:organizations" },
  { label: "Write Organizations", value: "write:organizations" },
  { label: "Read Users", value: "read:users" },
  { label: "Write Users", value: "write:users" },
  { label: "Read Audit Logs", value: "read:audit" },
  { label: "Write Audit Logs", value: "write:audit" },
  { label: "Read Integrations", value: "read:integrations" },
  { label: "Write Integrations", value: "write:integrations" },
  { label: "Read Notifications", value: "read:notifications" },
  { label: "Write Notifications", value: "write:notifications" },
  { label: "Read Reports", value: "read:reports" },
  { label: "Write Reports", value: "write:reports" },
];

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

export const ApiKeyManagement: React.FC = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const {
    apiKeys,
    isLoadingApiKeys,
    apiKeyError,
    apiKeyUsage, // Although not directly used in this component's UI, it's fetched by its thunk
    isCreating,
    isUpdating,
    isDeleting,
  } = useAppSelector((state) => state.integration);

  // Local state for forms
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyDescription, setNewApiKeyDescription] = useState("");
  const [newApiKeyScopes, setNewApiKeyScopes] = useState<string[]>([]);
  const [newApiKeyExpiresAt, setNewApiKeyExpiresAt] = useState("");
  const [newApiKeyRestrictions, setNewApiKeyRestrictions] = useState("");

  const [confirmDeleteApiKeyId, setConfirmDeleteApiKeyId] = useState<string | null>(null);

  const [editApiKeyId, setEditApiKeyId] = useState<string | null>(null);
  const [editApiKeyName, setEditApiKeyName] = useState("");
  const [editApiKeyDescription, setEditApiKeyDescription] = useState("");
  const [editApiKeyScopes, setEditApiKeyScopes] = useState<string[]>([]);
  const [editApiKeyExpiresAt, setEditApiKeyExpiresAt] = useState("");
  const [editApiKeyRestrictions, setEditApiKeyRestrictions] = useState("");

  useEffect(() => {
    dispatch(fetchApiKeys({}));
    // Optionally fetch usage data if needed here or in a separate component/context
    // dispatch(fetchApiKeyUsage());
  }, [dispatch]);

  // Effect to display and clear errors
  useEffect(() => {
    if (apiKeyError) {
      toast({
        title: "API Key Error",
        description: apiKeyError,
        variant: "destructive",
      });
      dispatch(clearErrors());
    }
  }, [apiKeyError, toast, dispatch]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyName || newApiKeyScopes.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields for API Key (Name, Scopes).",
        variant: "destructive",
      });
      return;
    }
    const restrictions = newApiKeyRestrictions ? JSON.parse(newApiKeyRestrictions) : {};
    await dispatch(createApiKey({
      name: newApiKeyName,
      description: newApiKeyDescription,
      permissions: newApiKeyScopes,
      expiresAt: newApiKeyExpiresAt || undefined,
      restrictions: restrictions,
    }));
    toast({
      title: "API Key Created",
      description: "Your API Key has been created successfully. Remember to save it securely!",
    });
    setNewApiKeyName("");
    setNewApiKeyDescription("");
    setNewApiKeyScopes([]);
    setNewApiKeyExpiresAt("");
    setNewApiKeyRestrictions("");
  };

  const handleEditApiKey = (apiKey: ApiKey) => {
    setEditApiKeyId(apiKey.id);
    setEditApiKeyName(apiKey.name);
    setEditApiKeyDescription(apiKey.description);
    setEditApiKeyScopes(apiKey.scopes);
    setEditApiKeyExpiresAt(apiKey.expiresAt ? new Date(apiKey.expiresAt).toISOString().split('T')[0] : "");
    setEditApiKeyRestrictions(JSON.stringify(apiKey.restrictions, null, 2));
  };
  
  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editApiKeyId) return;

    const restrictions = editApiKeyRestrictions ? JSON.parse(editApiKeyRestrictions) : {};
    await dispatch(updateApiKey({
      apiKeyId: editApiKeyId,
      name: editApiKeyName,
      description: editApiKeyDescription,
      permissions: editApiKeyScopes,
      expiresAt: editApiKeyExpiresAt || undefined,
      isActive: true, // Assuming active if updating
      restrictions: restrictions,
    }));
    toast({
      title: "API Key Updated",
      description: "API Key details updated successfully.",
    });
    setEditApiKeyId(null);
  };

  const handleToggleApiKey = async (id: string, currentStatus: boolean) => {
    await dispatch(updateApiKey({ apiKeyId: id, isActive: !currentStatus }));
    toast({
      title: "API Key Status Updated",
      description: `API Key has been ${!currentStatus ? "enabled" : "disabled"} successfully.`,
    });
  };

  const handleDeleteApiKey = async (id: string) => {
    setConfirmDeleteApiKeyId(null);
    await dispatch(deleteApiKey(id));
    toast({
      title: "API Key Deleted",
      description: "API Key has been deleted successfully.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Manage your API keys for programmatic access to the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key Prefix</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Expires At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingApiKeys ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> Loading API Keys...
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No API keys configured yet.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell className="font-mono text-xs">{apiKey.keyPrefix}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {apiKey.scopes.map((scope) => (
                        <span key={scope} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(apiKey.expiresAt)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={apiKey.isActive}
                      onCheckedChange={(checked) => handleToggleApiKey(apiKey.id, apiKey.isActive)}
                      aria-label="Toggle API key status"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditApiKey(apiKey)}>Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 ml-2" // Used className instead of variant
                      onClick={() => setConfirmDeleteApiKeyId(apiKey.id)}
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
          <h3 className="text-lg font-semibold mb-3">Create New API Key</h3>
          <form onSubmit={handleCreateApiKey} className="space-y-4">
            <div>
              <Label htmlFor="apiKeyName" className="mb-1 block">Name</Label>
              <Input
                id="apiKeyName"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                placeholder="My Service Key"
              />
            </div>
            <div>
              <Label htmlFor="apiKeyDescription" className="mb-1 block">Description (Optional)</Label>
              <Input
                id="apiKeyDescription"
                value={newApiKeyDescription}
                onChange={(e) => setNewApiKeyDescription(e.target.value)}
                placeholder="Description of your API key"
              />
            </div>
            <div>
              <Label htmlFor="apiKeyScopes" className="mb-1 block">Permissions (Scopes)</Label>
              {MultiSelect && (
                <MultiSelect
                  options={availableApiKeyScopes}
                  value={newApiKeyScopes}
                  onValueChange={setNewApiKeyScopes}
                  placeholder="Select permissions..."
                />
              )}
            </div>
            <div>
              <Label htmlFor="apiKeyExpiresAt" className="mb-1 block">Expires At (Optional Date)</Label>
              <Input
                id="apiKeyExpiresAt"
                type="date"
                value={newApiKeyExpiresAt}
                onChange={(e) => setNewApiKeyExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="apiKeyRestrictions" className="mb-1 block">IP/Domain Restrictions (JSON, Optional)</Label>
              <Textarea
                id="apiKeyRestrictions"
                value={newApiKeyRestrictions}
                onChange={(e) => setNewApiKeyRestrictions(e.target.value)}
                placeholder='{"ipAddresses": ["192.168.1.1"], "domains": ["example.com"]}'
              />
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create API Key
            </Button>
          </form>
        </div>
      </CardContent>

      <AlertDialog open={!!confirmDeleteApiKeyId} onOpenChange={(open) => setConfirmDeleteApiKeyId(open ? confirmDeleteApiKeyId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground" // Used className instead of variant
              onClick={() => confirmDeleteApiKeyId && handleDeleteApiKey(confirmDeleteApiKeyId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editApiKeyId} onOpenChange={(open) => setEditApiKeyId(open ? editApiKeyId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Modify the details of your API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleUpdateApiKey} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editApiKeyName" className="mb-1 block">Name</Label>
              <Input
                id="editApiKeyName"
                value={editApiKeyName}
                onChange={(e) => setEditApiKeyName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editApiKeyDescription" className="mb-1 block">Description (Optional)</Label>
              <Input
                id="editApiKeyDescription"
                value={editApiKeyDescription}
                onChange={(e) => setEditApiKeyDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editApiKeyScopes" className="mb-1 block">Permissions (Scopes)</Label>
              {MultiSelect && (
                <MultiSelect
                  options={availableApiKeyScopes}
                  value={editApiKeyScopes}
                  onValueChange={setEditApiKeyScopes}
                  placeholder="Select permissions..."
                />
              )}
            </div>
            <div>
              <Label htmlFor="editApiKeyExpiresAt" className="mb-1 block">Expires At (Optional Date)</Label>
              <Input
                id="editApiKeyExpiresAt"
                type="date"
                value={editApiKeyExpiresAt}
                onChange={(e) => setEditApiKeyExpiresAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editApiKeyRestrictions" className="mb-1 block">IP/Domain Restrictions (JSON, Optional)</Label>
              <Textarea
                id="editApiKeyRestrictions"
                value={editApiKeyRestrictions}
                onChange={(e) => setEditApiKeyRestrictions(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditApiKeyId(null)}>Cancel</AlertDialogCancel>
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