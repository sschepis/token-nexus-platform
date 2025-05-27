import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Parse from 'parse';

interface DfnsTransactionButtonProps {
  userId: string;
  organizationId: string;
  transactionDetails: Record<string, unknown>; // More specific type: flexible object
  onTransactionSuccess?: (result: Record<string, unknown>) => void;
  onTransactionError?: (error: unknown) => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const DfnsTransactionButton: React.FC<DfnsTransactionButtonProps> = ({
  userId,
  organizationId,
  transactionDetails,
  onTransactionSuccess,
  onTransactionError,
  children,
  className,
  variant = "default",
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExecuteTransaction = async () => {
    setIsProcessing(true);
    try {
      const result = await Parse.Cloud.run('executeDfnsTransaction', {
        userId,
        organizationId,
        transactionDetails,
      });

      if (result.status === 'success') {
        toast.success(result.message || 'Transaction executed successfully!');
        onTransactionSuccess?.(result);
      } else {
        toast.error(result.message || 'Transaction execution failed.');
        onTransactionError?.(new Error(result.message || 'Transaction failed without specific error.'));
      }
    } catch (error) {
      console.error('Error executing Dfns transaction:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute Dfns transaction.', { duration: 5000 });
      onTransactionError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handleExecuteTransaction}
      disabled={isProcessing}
      className={className}
      variant={variant}
    >
      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
};

export default DfnsTransactionButton;