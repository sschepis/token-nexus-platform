/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { DollarSign, Users, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

interface QuickActionsWidgetProps {
  id: string;
  config?: Record<string, any>;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ id, config }) => {
  return (
    <div className="grid gap-3">
      <Link
        href="/tokens/create"
        className="flex items-center gap-2 p-3 rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-sm">Create Token</h4>
          <p className="text-xs text-muted-foreground">Mint a new token asset</p>
        </div>
      </Link>
      
      <Link
        href="/users/invite"
        className="flex items-center gap-2 p-3 rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-sm">Invite User</h4>
          <p className="text-xs text-muted-foreground">Add members to your org</p>
        </div>
      </Link>
      
      <Link
        href="/settings"
        className="flex items-center gap-2 p-3 rounded-lg hover:bg-secondary transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCcw className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="font-medium text-sm">Manage Settings</h4>
          <p className="text-xs text-muted-foreground">Configure your organization</p>
        </div>
      </Link>
    </div>
  );
};
