"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryInitialSync = tryInitialSync;
exports.getDeploymentsByNetwork = getDeploymentsByNetwork;
exports.syncDeployments = syncDeployments;
// this syncs the deployment on server startup
async function tryInitialSync() {
    // This function seems to be for initial system sync, not organization-specific import
    // We will create a new function for organization import (which is in networkImportManager.ts)
    console.warn("tryInitialSync is for system-wide sync, use importHardhatDeploymentsForOrganization for organization-specific import.");
    return; // Prevent execution of the old sync logic
}
async function getDeploymentsByNetwork() {
    console.warn("getDeploymentsByNetwork is not used in the import script and is deprecated.");
    return { networkFolders: [], networkFolderPath: '', deploymentsByNetwork: {} };
}
// Main sync function (placeholder, actual import triggered by API)
async function syncDeployments() {
    console.log('Starting deployment synchronization...');
    // This function would usually read from a global deployments directory
    // For now, it's a placeholder. The actual import will be triggered by the Next.js API
    // calling functions from networkImportManager.ts.
    console.log('Deployment synchronization completed (placeholder).');
}
