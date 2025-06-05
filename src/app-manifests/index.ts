// Nomyx Standard Applications - App Manifests
// This file exports all the standard application manifests for the Nomyx platform

import { identityManagementManifest } from './identity-management-manifest';
import { digitalAssetManifest } from './digital-asset-manifest';
import { tradeFinanceManifest } from './trade-finance-manifest';
import { kycComplianceManifest } from './kyc-compliance-manifest';
import { walletManagementManifest } from './wallet-management-manifest';
import { platformAdminManifest } from './platform-admin-manifest';

// Re-export individual manifests
export { identityManagementManifest } from './identity-management-manifest';
export { digitalAssetManifest } from './digital-asset-manifest';
export { tradeFinanceManifest } from './trade-finance-manifest';
export { kycComplianceManifest } from './kyc-compliance-manifest';
export { walletManagementManifest } from './wallet-management-manifest';
export { platformAdminManifest } from './platform-admin-manifest';

// Collection of all standard app manifests
export const standardAppManifests = [
  identityManagementManifest,
  digitalAssetManifest,
  tradeFinanceManifest,
  kycComplianceManifest,
  walletManagementManifest,
  platformAdminManifest
];

// App manifest lookup by ID
export const appManifestById = {
  'nomyx-identity-management': identityManagementManifest,
  'nomyx-digital-assets': digitalAssetManifest,
  'nomyx-trade-finance': tradeFinanceManifest,
  'nomyx-kyc-compliance': kycComplianceManifest,
  'nomyx-wallet-management': walletManagementManifest,
  'nomyx-platform-admin': platformAdminManifest
};

// Helper function to get manifest by ID
export function getAppManifestById(appId: string) {
  return appManifestById[appId as keyof typeof appManifestById];
}

// Helper function to get all app IDs
export function getAllAppIds(): string[] {
  return Object.keys(appManifestById);
}

// Helper function to get manifests by category
export function getManifestsByCategory(category: 'core' | 'finance' | 'compliance' | 'admin') {
  switch (category) {
    case 'core':
      return [identityManagementManifest, digitalAssetManifest, walletManagementManifest];
    case 'finance':
      return [tradeFinanceManifest, digitalAssetManifest];
    case 'compliance':
      return [kycComplianceManifest];
    case 'admin':
      return [platformAdminManifest];
    default:
      return [];
  }
}