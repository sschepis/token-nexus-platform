import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { ChildOrg } from './types';

interface LifecycleActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrg: ChildOrg | null;
  lifecycleAction: string;
  lifecycleReason: string;
  onLifecycleReasonChange: (reason: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function LifecycleActionDialog({
  isOpen,
  onOpenChange,
  selectedOrg,
  lifecycleAction,
  lifecycleReason,
  onLifecycleReasonChange,
  onSubmit,
  onCancel,
  isProcessing
}: LifecycleActionDialogProps) {
  const getActionTitle = () => {
    switch (lifecycleAction) {
      case 'suspend':
        return 'Suspend Organization';
      case 'reactivate':
        return 'Reactivate Organization';
      case 'archive':
        return 'Archive Organization';
      case 'activate':
        return 'Activate Organization';
      default:
        return 'Update Organization Status';
    }
  };

  const getActionDescription = () => {
    switch (lifecycleAction) {
      case 'suspend':
        return `Suspend ${selectedOrg?.name} and prevent access to the platform`;
      case 'reactivate':
        return `Reactivate ${selectedOrg?.name} and restore access to the platform`;
      case 'archive':
        return `Archive ${selectedOrg?.name} and permanently disable access`;
      case 'activate':
        return `Activate ${selectedOrg?.name} and enable access to the platform`;
      default:
        return `Update the status of ${selectedOrg?.name}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getActionTitle()}</DialogTitle>
          <DialogDescription>
            {getActionDescription()}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div>
            <Label htmlFor="lifecycle-reason">Reason for Action</Label>
            <Textarea
              id="lifecycle-reason"
              value={lifecycleReason}
              onChange={(e) => onLifecycleReasonChange(e.target.value)}
              placeholder="Provide a reason for this action..."
              className="mt-2"
            />
          </div>
          {lifecycleAction === 'activate' && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Activation</AlertTitle>
              <AlertDescription>
                This will enable access to the platform for this organization.
              </AlertDescription>
            </Alert>
          )}
          {lifecycleAction === 'reactivate' && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Reactivation</AlertTitle>
              <AlertDescription>
                This will restore access to the platform for this organization.
              </AlertDescription>
            </Alert>
          )}
          {(lifecycleAction === 'suspend' || lifecycleAction === 'archive') && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This action will {lifecycleAction === 'archive' ? 'permanently disable' : 'temporarily suspend'} access to the platform for this organization.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={isProcessing}
            variant={lifecycleAction === 'suspend' || lifecycleAction === 'archive' ? 'destructive' : 'default'}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `${getActionTitle()}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}