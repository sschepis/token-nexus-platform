import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, CheckCircle, XCircle } from 'lucide-react';
import { Badge, badgeVariants } from '@/components/ui/badge'; // Import badgeVariants
import { VariantProps } from "class-variance-authority"; // Import VariantProps

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

interface DfnsWalletDisplayProps {
  walletAddress?: string;
  dfnsWalletId?: string;
  isProvisioned: boolean;
}

const DfnsWalletDisplay: React.FC<DfnsWalletDisplayProps> = ({
  walletAddress,
  dfnsWalletId,
  isProvisioned,
}) => {
  const getStatusDisplay = (): { icon: React.ReactNode | null; badgeVariant: BadgeVariant; text: string } => {
    if (isProvisioned && walletAddress && dfnsWalletId) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        badgeVariant: 'success',
        text: 'Provisioned',
      };
    } else {
      return {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        badgeVariant: 'destructive',
        text: 'Not Provisioned',
      };
    }
  };

  const { icon, badgeVariant, text } = getStatusDisplay();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dfns Wallet Status
          {icon && React.isValidElement(icon) ? icon : null}
          <Badge className="ml-2" variant={badgeVariant}>{text}</Badge>
        </CardTitle>
        <CardDescription>
          {isProvisioned ? 'Your secure Dfns wallet has been provisioned.' : 'Your Dfns wallet is not yet provisioned.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isProvisioned && walletAddress && (
          <div className="text-sm">
            <p className="font-medium text-gray-700">Wallet Address:</p>
            <p className="break-all font-mono text-muted-foreground">{walletAddress}</p>
          </div>
        )}
        {isProvisioned && dfnsWalletId && (
          <div className="text-sm">
            <p className="font-medium text-gray-700">Dfns Wallet ID:</p>
            <p className="break-all font-mono text-muted-foreground">{dfnsWalletId}</p>
          </div>
        )}
        {!isProvisioned && (
          <p className="text-sm text-muted-foreground">
            Complete your KYC verification to provision your Dfns wallet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DfnsWalletDisplay;