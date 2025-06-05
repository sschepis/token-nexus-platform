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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import dynamic from 'next/dynamic';
const MultiSelect = dynamic(() => import('@/components/ui/multi-select').then(mod => mod.MultiSelect), {
  ssr: false,
  loading: () => <div>Loading MultiSelect...</div>
});

import { Link as LinkIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  OAuthApp,
  fetchOAuthApps,
  createOAuthApp,
  updateOAuthApp,
  regenerateOAuthSecret,
  deleteOAuthApp,
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

const availableOAuthScopes = [
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

const applicationTypes = [
  { label: "Web Application", value: "web" },
  { label: "Mobile Application", value: "mobile" },
  { label: "Desktop Application", value: "desktop" },
  { label: "SPA (Single Page App)", value: "spa" },
];

export const OAuthAppManagement: React.FC = () => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const {
    oauthApps,
    isLoadingOAuthApps,
    oauthError,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAppSelector((state) => state.integration);

  // Local state for forms
  const [newOAuthAppName, setNewOAuthAppName] = useState("");
  const [newOAuthAppDescription, setNewOAuthAppDescription] = useState("");
  const [newOAuthAppRedirectUris, setNewOAuthAppRedirectUris] = useState("");
  const [newOAuthAppScopes, setNewOAuthAppScopes] = useState<string[]>([]);
  const [newOAuthAppType, setNewOAuthAppType] = useState("web");

  const [confirmDeleteOAuthAppId, setConfirmDeleteOAuthAppId] = useState<string | null>(null);
  const [regenSecretOAuthAppId, setRegenSecretOAuthAppId] = useState<string | null>(null);
  const [newlyGeneratedSecret, setNewlyGeneratedSecret] = useState<string | null>(null);

  const [editOAuthAppId, setEditOAuthAppId] = useState<string | null>(null);
  const [editOAuthAppName, setEditOAuthAppName] = useState("");
  const [editOAuthAppDescription, setEditOAuthAppDescription] = useState("");
  const [editOAuthAppRedirectUris, setEditOAuthAppRedirectUris] = useState("");
  const [editOAuthAppScopes, setEditOAuthAppScopes] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchOAuthApps({}));
  }, [dispatch]);

  // Effect to display and clear errors
  useEffect(() => {
    if (oauthError) {
      toast({
        title: "OAuth App Error",
        description: oauthError,
        variant: "destructive",
      });
      dispatch(clearErrors());
    }
  }, [oauthError, toast, dispatch]);

  const handleCreateOAuthApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOAuthAppName || !newOAuthAppRedirectUris || newOAuthAppScopes.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields for OAuth App (Name, Redirect URIs, Scopes).",
        variant: "destructive",
      });
      return;
    }
    const result = await dispatch(createOAuthApp({
      name: newOAuthAppName,
      description: newOAuthAppDescription,
      redirectUris: newOAuthAppRedirectUris.split(',').map(uri => uri.trim()),
      scopes: newOAuthAppScopes,
      applicationType: newOAuthAppType,
    })).unwrap();

    toast({
      title: "OAuth Application Created",
      description: "Your OAuth application has been created successfully.",
    });
    setNewOAuthAppName("");
    setNewOAuthAppDescription("");
    setNewOAuthAppRedirectUris("");
    setNewOAuthAppScopes([]);
    setNewOAuthAppType("web");
  };

  const handleEditOAuthApp = (app: OAuthApp) => {
    setEditOAuthAppId(app.id);
    setEditOAuthAppName(app.name);
    setEditOAuthAppDescription(app.description);
    setEditOAuthAppRedirectUris(app.redirectUris.join(', '));
    setEditOAuthAppScopes(app.scopes);
  };

  const handleUpdateOAuthApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOAuthAppId) return;

    await dispatch(updateOAuthApp({
      oauthAppId: editOAuthAppId,
      name: editOAuthAppName,
      description: editOAuthAppDescription,
      redirectUris: editOAuthAppRedirectUris.split(',').map(uri => uri.trim()),
      scopes: editOAuthAppScopes,
    }));
    toast({
      title: "OAuth Application Updated",
      description: "OAuth application details updated successfully.",
    });
    setEditOAuthAppId(null);
  };


  const handleRegenerateSecret = async (id: string) => {
    const result = await dispatch(regenerateOAuthSecret(id)).unwrap();
    setNewlyGeneratedSecret(result.clientSecret);
    setRegenSecretOAuthAppId(id);
    toast({
      title: "Secret Regenerated",
      description: "New client secret generated successfully.",
    });
  };

  const handleDeleteOAuthApp = async (id: string) => {
    setConfirmDeleteOAuthAppId(null);
    await dispatch(deleteOAuthApp(id));
    toast({
      title: "OAuth Application Deleted",
      description: "OAuth application has been deleted successfully.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>OAuth Apps</CardTitle>
        <CardDescription>
          Manage applications that integrate with your platform using OAuth.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[200px]">Redirect URIs</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingOAuthApps ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> Loading OAuth Apps...
                </TableCell>
              </TableRow>
            ) : oauthApps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No OAuth applications configured yet.
                </TableCell>
              </TableRow>
            ) : (
              oauthApps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-mono text-xs">{app.clientId}</TableCell>
                  <TableCell className="font-medium">{app.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {app.redirectUris.map((uri) => (
                        <span key={uri} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {uri}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {app.scopes.map((scope) => (
                        <span key={scope} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{app.applicationType}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditOAuthApp(app)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRegenerateSecret(app.id)} className="ml-2">Regenerate Secret</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 ml-2" // Used className instead of variant
                      onClick={() => setConfirmDeleteOAuthAppId(app.id)}
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
          <h3 className="text-lg font-semibold mb-3">Create New OAuth Application</h3>
          <form onSubmit={handleCreateOAuthApp} className="space-y-4">
            <div>
              <Label htmlFor="appName" className="mb-1 block">Application Name</Label>
              <Input
                id="appName"
                value={newOAuthAppName}
                onChange={(e) => setNewOAuthAppName(e.target.value)}
                placeholder="My Internal CRM Tool"
              />
            </div>
            <div>
              <Label htmlFor="appDescription" className="mb-1 block">Description (Optional)</Label>
              <Input
                id="appDescription"
                value={newOAuthAppDescription}
                onChange={(e) => setNewOAuthAppDescription(e.target.value)}
                placeholder="Description of your application"
              />
            </div>
            <div>
              <Label htmlFor="redirectUris" className="mb-1 block">Redirect URIs (Comma separated)</Label>
              <Textarea
                id="redirectUris"
                value={newOAuthAppRedirectUris}
                onChange={(e) => setNewOAuthAppRedirectUris(e.target.value)}
                placeholder="https://yourapp.com/callback, https://localhost:3000/callback"
              />
            </div>
            <div>
              <Label htmlFor="appScopes" className="mb-1 block">Scopes</Label>
              {MultiSelect && (
                <MultiSelect
                  options={availableOAuthScopes}
                  value={newOAuthAppScopes}
                  onValueChange={setNewOAuthAppScopes}
                  placeholder="Select scopes..."
                />
              )}
            </div>
            <div>
              <Label htmlFor="applicationType" className="mb-1 block">Application Type</Label>
              <Select value={newOAuthAppType} onValueChange={setNewOAuthAppType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {applicationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create OAuth App
            </Button>
          </form>
        </div>
      </CardContent>

      <AlertDialog open={!!confirmDeleteOAuthAppId} onOpenChange={(open) => setConfirmDeleteOAuthAppId(open ? confirmDeleteOAuthAppId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your OAuth application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground" // Used className instead of variant
              onClick={() => confirmDeleteOAuthAppId && handleDeleteOAuthApp(confirmDeleteOAuthAppId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!regenSecretOAuthAppId} onOpenChange={(open) => { if (!open) setNewlyGeneratedSecret(null); setRegenSecretOAuthAppId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Client Secret Regenerated</AlertDialogTitle>
            <AlertDialogDescription>
              Your new client secret is: <code className="font-mono bg-muted p-1 rounded break-all">{newlyGeneratedSecret}</code>
              <br />
              Please save this secret now. It will not be shown again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setNewlyGeneratedSecret(null); setRegenSecretOAuthAppId(null); }}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editOAuthAppId} onOpenChange={(open) => setEditOAuthAppId(open ? editOAuthAppId : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit OAuth App</AlertDialogTitle>
            <AlertDialogDescription>
              Modify the details of your OAuth application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleUpdateOAuthApp} className="space-y-4 py-4">
            <div>
              <Label htmlFor="editAppName" className="mb-1 block">Application Name</Label>
              <Input
                id="editAppName"
                value={editOAuthAppName}
                onChange={(e) => setEditOAuthAppName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editAppDescription" className="mb-1 block">Description (Optional)</Label>
              <Input
                id="editAppDescription"
                value={editOAuthAppDescription}
                onChange={(e) => setEditOAuthAppDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editRedirectUris" className="mb-1 block">Redirect URIs (Comma separated)</Label>
              <Textarea
                id="editRedirectUris"
                value={editOAuthAppRedirectUris}
                onChange={(e) => setEditOAuthAppRedirectUris(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editAppScopes" className="mb-1 block">Scopes</Label>
              {MultiSelect && (
                <MultiSelect
                  options={availableOAuthScopes}
                  value={editOAuthAppScopes}
                  onValueChange={setEditOAuthAppScopes}
                  placeholder="Select scopes..."
                />
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEditOAuthAppId(null)}>Cancel</AlertDialogCancel>
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