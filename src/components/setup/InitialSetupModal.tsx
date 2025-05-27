import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // Changed from react-router-dom
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlatformState } from '@/services/appInitService';

interface InitialSetupModalProps {
  onClose?: () => void;
}

const InitialSetupModal: React.FC<InitialSetupModalProps> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [platformState, setPlatformState] = useState<PlatformState | null>(null);
  const router = useRouter(); // Changed from useNavigate

  useEffect(() => {
    // Get platform state from sessionStorage
    const storedStatus = sessionStorage.getItem('platformStatus');
    if (storedStatus) {
      try {
        const status = JSON.parse(storedStatus);
        setPlatformState(status.status);

        // Only open modal if we're in a setup state and not already on a setup route
        const isSetupState = 
          status.status === 'CORE_ARTIFACTS_IMPORTED' || 
          status.status === 'PARENT_ORG_CREATING';
        
        const isSetupRoute = router.pathname.startsWith('/setup/');
        
        setIsOpen(isSetupState && !isSetupRoute);
      } catch (e) {
        console.error('Error parsing platform status:', e);
      }
    }
  }, [router]);

  const handleProceedToSetup = () => {
    // Navigate to the appropriate setup route based on platform state
    if (platformState === 'CORE_ARTIFACTS_IMPORTED') {
      router.push('/setup/bootstrap-login');
    } else if (platformState === 'PARENT_ORG_CREATING') {
      router.push('/setup/create-org-admin');
    }

    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Token Nexus Platform</DialogTitle>
          <DialogDescription className="text-lg">
            Initial setup required
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p>
            Thank you for choosing Token Nexus Platform. Before you can start using the platform, 
            we need to set up a few things:
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                1
              </div>
              <div>
                <h4 className="font-medium">Create a Parent Organization</h4>
                <p className="text-sm text-muted-foreground">
                  This is the main organization that will own all resources and manage other organizations.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                2
              </div>
              <div>
                <h4 className="font-medium">Set Up System Administrator</h4>
                <p className="text-sm text-muted-foreground">
                  Create the initial system administrator account with full platform access.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button size="lg" onClick={handleProceedToSetup}>
            Proceed to Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InitialSetupModal;