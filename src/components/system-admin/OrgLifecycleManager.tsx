import React from 'react';
import { OrgLifecycleManager as ModularOrgLifecycleManager } from './org-lifecycle';

// Re-export the modular component as the main component
export function OrgLifecycleManager() {
  return <ModularOrgLifecycleManager />;
}

export default OrgLifecycleManager;