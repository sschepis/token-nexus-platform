
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { uninstallOrgApp, updateAppSettings } from '@/store/slices/appSlice'; // Corrected import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { App } from '@/types/app-marketplace';
import { ArrowLeft } from 'lucide-react';

interface AppSettingsProps {
  appId: string;
  onBack: () => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ appId, onBack }) => {
  const dispatch = useAppDispatch();
  const { apps, installedOrgApps } = useAppSelector((state) => state.app); // Also get installedOrgApps
  const currentOrg = useAppSelector((state) => state.org.currentOrg); // Get current org for context
  const app = apps.find((a) => a.id === appId); // This is the AppDefinition
  
  const [showUninstallDialog, setShowUninstallDialog] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown>>(app?.settings || {}); // Changed any to unknown
 
  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">App not found</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          Back to Apps
        </Button>
      </div>
    );
  }

  const handleUninstall = () => {
    // Find the specific installation of this app for the current organization
    const installation = installedOrgApps.find(
      (inst) => inst.appDefinition?.objectId === appId && inst.organization?.objectId === currentOrg?.id
    );

    if (installation && installation.objectId) {
      dispatch(uninstallOrgApp({ orgAppInstallationId: installation.objectId }));
      onBack(); // Navigate back after dispatching
    } else {
      console.error("Could not find installation ID for app:", appId, "and org:", currentOrg?.id);
      // Show a toast or error message to the user
      // toast.error("Failed to initiate uninstall: Installation not found.");
    }
  };
 
  const handleSettingChange = (key: string, value: unknown) => { // Changed any to unknown
    setSettings({
      ...settings,
      [key]: value,
    });
  };

  const saveSettings = () => {
    dispatch(updateAppSettings({ appId, settings }));
  };
 
  const renderSettingField = (key: string, value: unknown) => { // Changed any to unknown
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center space-x-2" key={key}>
          <Switch
            id={key}
            checked={value}
            onCheckedChange={(checked) => handleSettingChange(key, checked)}
          />
          <Label htmlFor={key} className="cursor-pointer">
            {key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Label>
        </div>
      );
    } else if (typeof value === 'string' || typeof value === 'number') {
      return (
        <div className="grid gap-2" key={key}>
          <Label htmlFor={key}>
            {key
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Label>
          <Input
            id={key}
            value={value}
            onChange={(e) => handleSettingChange(key, e.target.value)}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-3">
              {app.icon ? (
                <img src={app.icon} alt={app.name} className="w-8 h-8 rounded" />
              ) : (
                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-lg font-bold">
                  {app.name.charAt(0)}
                </div>
              )}
              {app.name}
            </CardTitle>
            <CardDescription>Version {app.version} • Installed on {app.installDate || 'Unknown date'}</CardDescription>
          </div>
          <Badge variant="outline">{app.category}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{app.description}</p>
          
          <h3 className="text-sm font-medium mb-2">Permissions Granted</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {app.permissions.map((permission) => (
              <Badge key={permission} variant="secondary">
                {permission}
              </Badge>
            ))}
          </div>

          <Separator className="my-4" />
          
          <h3 className="text-sm font-medium mb-4">App Settings</h3>
          <div className="space-y-4">
            {Object.keys(settings).length > 0 ? (
              Object.entries(settings).map(([key, value]) => renderSettingField(key, value))
            ) : (
              <p className="text-sm text-muted-foreground">This app has no configurable settings.</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {Object.keys(settings).length > 0 && (
            <Button onClick={saveSettings}>Save Settings</Button>
          )}
          <Button variant="destructive" onClick={() => setShowUninstallDialog(true)}>
            Uninstall
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showUninstallDialog} onOpenChange={setShowUninstallDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall {app.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to uninstall this app? This will remove all app data and settings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUninstall}>Uninstall</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppSettings;
