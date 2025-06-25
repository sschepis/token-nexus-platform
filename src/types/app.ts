// src/types/app.ts

// Platform status types
export type PlatformState = 'PRISTINE' | 'CORE_ARTIFACTS_IMPORTING' | 'CORE_ARTIFACTS_IMPORTED' |
  'PARENT_ORG_CREATING' | 'PARENT_ORG_CREATED' | 'OPERATIONAL' | 'ERROR';

export interface PlatformStatus {
  status: PlatformState;
  message?: string;
  coreContractsImportedForNetwork?: string;
  parentOrgId?: string;
  error?: string;
}