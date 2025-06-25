import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { ChildOrg } from './types';

interface TransferOwnershipDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrg: ChildOrg | null;
  newOwnerEmail: string;
  onNewOwnerEmailChange: (email: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export function TransferOwnershipDialog({
  isOpen,
  onOpenChange,
  selectedOrg,
  newOwnerEmail,
  onNewOwnerEmailChange,
  onSubmit,
  onCancel,
  isProcessing
}: TransferOwnershipDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Organization Ownership</DialogTitle>
          <DialogDescription>
            Transfer ownership of {selectedOrg?.name} to a new owner
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div>
            <Label htmlFor="new-owner-email">New Owner Email</Label>
            <Input
              id="new-owner-email"
              type="email"
              value={newOwnerEmail}
              onChange={(e) => onNewOwnerEmailChange(e.target.value)}
              placeholder="newowner@example.com"
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isProcessing || !newOwnerEmail}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              'Transfer Ownership'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}