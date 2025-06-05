# Project Implementation Plan - Remaining Tasks Checklist

This document outlines the remaining tasks for developing the Salesforce-like platform, based on the status check of `PROJECT_IMPLEMENTATION_PLAN.md`. While a solid foundation is in place, significant work remains across all phases.

## I. System Administration Interface Core Functionalities (Partial Implementation)

- [ ] **1.1. App Store Management (App Bundles)**:
    - [ ] **Backend (Parse Server)**:
        - [ ] Define and implement Parse Server classes for `AppDefinition` (name, description, publisher, category, icon), `AppVersion` (version string, bundle URL, changelog, status), and `AppReview` (reviewer, comments, status).
        - [ ] Implement Cloud Functions: `submitAppForReview`, `approveAppVersion`, `rejectAppVersion`, `publishAppVersion`, and `listAppsForAdmin(statusFilter)`.
    - [ ] **Frontend (`AppBundleManager.tsx`)**:
        - [ ] Enhance `src/components/system-admin/AppBundleManager.tsx` to:
            - [ ] List all applications with their versions and statuses.
            - [ ] Allow viewing detailed information of an app version.
            - [ ] Provide administrative actions (approve, reject, publish) with appropriate UI and permissions checks.
            - [ ] (Optional) Develop a form/wizard for System Admins to manually add/edit app definitions.
- [ ] **1.2. Global Organization Management (Frontend UI Completion)**:
    - [ ] Fully develop the user interface for `src/components/system-admin/GlobalOrgManager.tsx` to:
        - [ ] Display a comprehensive table/list of all organizations with key details and status.
        - [ ] Implement robust searching and filtering capabilities for organizations.
        - [ ] Provide direct actions (buttons/menus) to view details, suspend, activate, and create new organizations, all integrated with the existing backend cloud functions.
- [ ] **1.3. Global User Management (Frontend UI Completion)**:
    - [ ] Fully develop the user interface for `src/components/system-admin/GlobalUserManager.tsx` to:
        - [ ] List all users with key details (email, name, organization, status).
        - [ ] Implement searching and filtering for users.
        - [ ] Provide actions to view details, suspend/reactivate users (integrated with existing backend cloud functions).
        - [ ] (Optional) Implement UI for
            `assignGlobalRole` if needed.
- [ ] **1.4. Platform Configuration & Monitoring (Enhancements & Specifics Needed)**:
    - [ ] Implement the `src/components/system-admin/ContractDeployWizard.tsx` component (currently missing).
    - [ ] Define and implement specific UI and backend logic for managing other platform-wide settings such as global API keys for third-party services, feature flags, and displaying system health metrics (e.g., within `src/components/system-admin/ChainConfigurator.tsx` or `DeploymentDashboard.tsx` if appropriate).

## II. Enhance Organization Interfaces (Partial Implementation)

- [ ] **2.1. Standard Organization Interface: Dashboard Application Access**:
    - [ ] Fully integrate `src/components/dashboard/widgets/InstalledAppsWidget.tsx` to:
        - [ ] Fetch and display actual applications installed for the current organization.
        - [ ] Ensure "Launch" buttons navigate correctly to the respective installed applications, potentially requiring dynamic routing or a central app launcher.
- [ ] **2.1. Standard Organization Interface: App Marketplace - Installation/Management**:
    - [ ] **Backend (Parse Server)**: Implement the `updateAppInOrg(orgAppInstallationId, newVersionId)` cloud function for app updates.
    - [ ] **Frontend (`AppMarketplace.tsx`)**:
        - [ ] Enhance `src/components/pages/AppMarketplace.tsx` (and potentially `ComponentCard.tsx` if used there) to dynamically display "Install," "Uninstall," and "Update" buttons based on an app's installation status for the current organization.
        - [ ] Implement modals or dialogs for installation confirmation, ensuring `src/components/app-marketplace/AppConsentDialog.tsx` is fully integrated with backend installation functions.
- [ ] **2.2. Parent / Issuing Org Interface**:
    - [ ] Implement the "Mechanism for 'Operating as Parent Org'" to allow System Admins to switch to or access specialized features for the Parent Organization.
    - [ ] Fully implement the UI/UX for `src/components/system-admin/OrgLifecycleManager.tsx` (for creating/managing customer organizations), `src/components/system-admin/MarketingCMS.tsx` (for managing content for public-facing pages), and `src/components/system-admin/SignupManagement.tsx` (for viewing and processing new organization/user signups).

## III. Framework for Application Administration UIs (Major Implementation)

- [ ] **1. Routing Convention**:
    - [ ] Define and implement a standardized URL pattern for installed application administration interfaces (e.g., `/org/:orgId/apps/:installedAppId/admin/...`). This requires updates to `src/components/app-framework/AppRouter.tsx` or a similar routing mechanism.
- [ ] **2. Layout Integration**:
    - [ ] Modify `src/components/app-framework/AppLayout.tsx` or create other necessary nested layouts to correctly host and integrate app-specific admin UIs, including support for app-specific sidebars or tabs.
- [ ] **3. App Manifest Updates**:
    - [ ] Update the `AppManifest` structure (in `src/types/app-framework.d.ts`) to allow applications to declare their administration UI entry points and navigation structures.
- [ ] **4. Example Implementation**:
    - [ ] Build a concrete, simple administration UI for one of the example applications (e.g., "Team Chat" settings) to serve as a proof of concept and template for future app developers.

## IV. Cross-Cutting Concerns (Ongoing & Verification)

- [ ] **RBAC (Role-Based Access Control)**:
    - [ ] Implement detailed role checks for every new feature and UI element to ensure appropriate access control.
- [ ] **Data Modeling**:
    - [ ] Continuously refine and update relevant Parse Server schemas (e.g., for App Store, Marketing CMS) as new features are developed.
- [ ] **API/Cloud Functions**:
    - [ ] Build robust backend logic for all new functionalities, ensuring proper error handling, input validation, and security measures.
- [ ] **UI/UX**:
    - [ ] Progressively replace all remaining placeholder UI elements with polished, user-friendly interfaces.
- [ ] **System Admin Permission Flow (Re-evaluation)**:
    - [ ] Revisit and fully implement the `customUserLogin` cloud function or equivalent mechanism for system admin login to ensure the `isSystemAdmin` field is correctly assigned and leveraged for access control, as noted in `ORGANIZATION_SELECTOR_FIX_PLAN.md`.