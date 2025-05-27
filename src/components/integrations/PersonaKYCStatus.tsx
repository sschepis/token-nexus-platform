import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import { Badge, badgeVariants } from '@/components/ui/badge'; // Import badgeVariants
import { VariantProps } from "class-variance-authority"; // Import VariantProps

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

interface PersonaKYCStatusProps {
  userId: string; // The Parse User ID
  organizationId: string; // The Parse Organization ID
  kycStatus: 'not_started' | 'pending' | 'completed' | 'declined' | 'requires_attention';
  inquiryId?: string; // Optional Persona inquiry ID
  kycMessage?: string; // Optional message from backend
  onStartKYC?: (userId: string, organizationId: string) => void;
  onViewKYCDetails?: (inquiryId: string) => void;
}

const PersonaKYCStatus: React.FC<PersonaKYCStatusProps> = ({
  userId,
  organizationId,
  kycStatus,
  inquiryId,
  kycMessage,
  onStartKYC,
  onViewKYCDetails,
}) => {
  const getStatusDisplay = (): { icon: React.ReactNode | null; badgeVariant: BadgeVariant; text: string } => {
    switch (kycStatus) {
      case 'completed':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badgeVariant: 'success',
          text: 'Verified',
        };
      case 'pending':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          badgeVariant: 'warning',
          text: 'Pending Review',
        };
      case 'declined':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          badgeVariant: 'destructive',
          text: 'Declined',
        };
      case 'requires_attention':
        return {
          icon: <Info className="h-5 w-5 text-blue-500" />,
          badgeVariant: 'info',
          text: 'Requires Attention',
        };
      case 'not_started':
      default:
        return {
          icon: null,
          badgeVariant: 'secondary',
          text: 'Not Started',
        };
    }
  };

  const { icon, badgeVariant, text } = getStatusDisplay();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Persona KYC Status 
          {icon && React.isValidElement(icon) ? icon : null}
          <Badge className="ml-2" variant={badgeVariant}>{text}</Badge>
        </CardTitle>
        <CardDescription>
          {kycMessage || 'Your identity verification status for this organization.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {kycStatus === 'not_started' && onStartKYC && (
          <Button onClick={() => onStartKYC(userId, organizationId)} className="w-full">
            Start KYC Verification
          </Button>
        )}
        {(kycStatus === 'pending' || kycStatus === 'declined' || kycStatus === 'requires_attention') && inquiryId && onViewKYCDetails && (
          <Button onClick={() => onViewKYCDetails(inquiryId)} className="w-full" variant="outline">
            View KYC Inquiry Details
          </Button>
        )}
        {kycStatus === 'completed' && (
          <p className="text-sm text-muted-foreground">Your KYC is successfully verified.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonaKYCStatus;