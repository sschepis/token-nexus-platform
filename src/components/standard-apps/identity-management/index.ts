// Identity Management App Components
export { IdentityDashboard } from './IdentityDashboard';
export { IdentityCreation } from './IdentityCreation';

// Component map for app registration
import { IdentityDashboard } from './IdentityDashboard';
import { IdentityCreation } from './IdentityCreation';
import { AppComponentProps } from '@/types/app-framework';
import React from 'react';

export const identityManagementComponents = new Map<string, React.ComponentType<AppComponentProps>>([
  ['IdentityDashboard', IdentityDashboard],
  ['IdentityCreation', IdentityCreation]
]);