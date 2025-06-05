# Application Initialization and Setup - Remaining Tasks Checklist

This document outlines the remaining tasks for the application initialization and setup, based on the status check of `APP_INITIALIZATION_PLAN.md`.

## Phase 1: Core Contract Artifact Import (Implementation Details)

- [x] **Finalize `importCoreSystemArtifactsBatch` Cloud Function:**
- [x] Specify exact parameters for the Cloud Function (`importCoreSystemArtifactsBatch`).
- [x] Detail its internal logic for creating/updating Parse objects from artifact data (e.g., `Blockchain`, `Abi`, `SmartContract`, `DiamondFactory`, `DiamondFacet`, `DeploymentArtifact` records).
- [x] Clarify and implement idempotency logic within this Cloud Function.
- [ ] **Next.js Orchestration for Artifact Import:**
    - [ ] Detail and implement the Next.js server-side API route logic (e.g., within `/api/app-status` or a dedicated setup API) for:
        - [ ] Reading `NEXT_PUBLIC_PRIMARY_DEPLOYMENT_NETWORK_NAME`.
        - [ ] Reading `.chainId` file for `targetNetworkId`.
        - [ ] Constructing `deploymentsPath` and reading `*.json` artifact files using Node.js `fs` and `path`.
        - [ ] Collecting `artifactsData` (array of `{ artifactName, artifactContent }`).
        - [ ] Calling the `importCoreSystemArtifactsBatch` Parse Cloud Function.
        - [ ] Handling the success/failure outcomes from the Cloud Function (updating `PlatformConfig.coreContractsImportedForNetwork`, `PlatformConfig.coreFactoryAddresses`, `PlatformConfig.currentState`, or `PlatformConfig.lastSetupError`).