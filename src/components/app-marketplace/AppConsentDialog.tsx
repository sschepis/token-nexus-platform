
import React, { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { App } from '@/types/app-marketplace';

interface AppConsentDialogProps {
  app: App;
  onConfirm: (permissions: string[]) => void;
  onCancel: () => void;
}

const AppConsentDialog: React.FC<AppConsentDialogProps> = ({ app, onConfirm, onCancel }) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([...app.permissions]);
  const [confirmDisabled, setConfirmDisabled] = useState(false);

  const handlePermissionToggle = (permission: string) => {
    if (selectedPermissions.includes(permission)) {
      const newPermissions = selectedPermissions.filter(p => p !== permission);
      setSelectedPermissions(newPermissions);
      setConfirmDisabled(newPermissions.length === 0 && app.permissions.length > 0);
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
      setConfirmDisabled(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPermissions.length === app.permissions.length) {
      setSelectedPermissions([]);
      setConfirmDisabled(true);
    } else {
      setSelectedPermissions([...app.permissions]);
      setConfirmDisabled(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Install {app.name}</DialogTitle>
        <DialogDescription>
          This app is requesting the following permissions. Review and grant only the ones you're comfortable with.
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        {app.permissions.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Permissions</span>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedPermissions.length === app.permissions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="space-y-3">
              {app.permissions.map((permission) => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => handlePermissionToggle(permission)}
                  />
                  <label
                    htmlFor={permission}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {permission}
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">This app doesn't require any permissions.</p>
        )}
        
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Publisher Information</h4>
          <p className="text-sm text-muted-foreground">
            {app.name} (v{app.version}) is published by {app.publisher}.
          </p>
        </div>
      </div>
      
      <DialogFooter className="flex-col sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(selectedPermissions)}
          disabled={confirmDisabled}
        >
          Install
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

export default AppConsentDialog;
