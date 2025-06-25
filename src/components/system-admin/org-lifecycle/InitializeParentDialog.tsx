import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { InitFormData } from './types';

interface InitializeParentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: InitFormData;
  onFormDataChange: (data: InitFormData) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

export function InitializeParentDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isProcessing
}: InitializeParentDialogProps) {
  const updateFormData = (field: keyof InitFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Initialize Parent Organization</DialogTitle>
          <DialogDescription>
            Set up the parent organization and admin account
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="parent-name">Organization Name</Label>
            <Input
              id="parent-name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Platform Parent Organization"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parent-email">Contact Email</Label>
              <Input
                id="parent-email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateFormData('contactEmail', e.target.value)}
                placeholder="contact@platform.com"
              />
            </div>
            <div>
              <Label htmlFor="parent-phone">Contact Phone</Label>
              <Input
                id="parent-phone"
                value={formData.contactPhone}
                onChange={(e) => updateFormData('contactPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Admin Account</h4>
            <div>
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => updateFormData('adminEmail', e.target.value)}
                placeholder="admin@platform.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin-first">First Name</Label>
                <Input
                  id="admin-first"
                  value={formData.adminFirstName}
                  onChange={(e) => updateFormData('adminFirstName', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="admin-last">Last Name</Label>
                <Input
                  id="admin-last"
                  value={formData.adminLastName}
                  onChange={(e) => updateFormData('adminLastName', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              'Initialize'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}