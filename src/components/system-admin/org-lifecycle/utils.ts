// Utility functions for organization lifecycle management
// Note: Badge rendering functions moved to individual components to avoid import issues

export function getStatusConfig(status: string) {
  const statusConfig = {
    active: { variant: 'default' as const, label: 'Active' },
    suspended: { variant: 'destructive' as const, label: 'Suspended' },
    archived: { variant: 'secondary' as const, label: 'Archived' },
    pending: { variant: 'outline' as const, label: 'Pending' }
  };

  return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
}

export function getPlanConfig(planType: string) {
  const planConfig = {
    starter: { variant: 'outline' as const, label: 'Starter' },
    professional: { variant: 'default' as const, label: 'Professional' },
    enterprise: { variant: 'secondary' as const, label: 'Enterprise' }
  };

  return planConfig[planType as keyof typeof planConfig] || planConfig.starter;
}

// Helper function to format dates
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

// Helper function to get organization status color
export function getStatusColor(status: string): string {
  const colors = {
    active: 'text-green-600',
    suspended: 'text-red-600',
    archived: 'text-gray-600',
    pending: 'text-yellow-600'
  };

  return colors[status as keyof typeof colors] || colors.pending;
}