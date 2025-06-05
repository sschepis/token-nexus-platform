# Parse Server Organization Integration - Remaining Tasks Checklist

This document outlines the remaining tasks for the Parse Server Organization Integration, based on the status check of `PARSE_SERVER_ORGANIZATION_INTEGRATION_SUMMARY.md` and cross-referenced with related plans. While the summary document claims completion, a critical underlying architectural piece remains.

## I. Update Middleware (CRITICAL - Inferred from `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md`)

The `PARSE_SERVER_ORGANIZATION_INTEGRATION_SUMMARY.md` implies robust organization context handling, but `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md` explicitly states the need for a missing middleware to *automatically inject* organization context. This is a crucial next step for consistency and robustness.

- [ ] **Create and Implement Organization Context Middleware**:
    - [ ] Create the file `parse-server/cloud/middleware/organizationContextMiddleware.js`.
    - [ ] Implement the `getUserOrganization` helper function to robustly fetch the user's current organization across different sources (Redux store via global access, URL, Parse user object, relations).
    - [ ] Implement the `withOrganizationContext` async middleware function that:
        -   Automatically determines the organization ID for the authenticated user.
        -   Injects `organizationId` and the full `organization` object into `request.params` and `request` for cloud functions.
        -   Skips for system admin functions or master key requests.
- [ ] **Apply Middleware to Cloud Functions**:
    - [ ] Modify all relevant organization-aware Parse Cloud Functions (as detailed in `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md`, e.g., in `dashboard.js`, `orgManagement.js`, `organizations.js`, `orgAppInstallations.js`, `organizationAware.js`) to:
        -   Import `withOrganizationContext`.
        -   Apply it at the beginning of the function: `request = await withOrganizationContext(request);`.
        -   Remove any redundant explicit `organizationId` checks within these functions.

## II. Data Migration and Cleanup

- [ ] **Database Migration (Optional/As Needed)**:
    - [ ] If any `tenantId` string fields still exist in the Parse database (e.g., in `SmartContract` objects created before the pointer conversion), a migration script or process should be performed to convert them to proper `organization` Parse Pointer relationships. This ensures full data schema alignment.

## III. Documentation

- [ ] **Update API Documentation**:
    - [ ] Review and update all API documentation (especially for Parse Cloud Functions) to clearly reflect the consistent use of `organizationId` and how organization context is now automatically handled (e.g., no longer requiring explicit `organizationId` parameters in many frontend calls to cloud functions).

## IV. Testing and Verification

- [ ] **Comprehensive Testing of Middleware**: Once the middleware is implemented, conduct thorough unit, integration, and end-to-end tests to confirm its correct functionality and application across all relevant cloud functions and UI pages, ensuring proper context injection and error handling.
- [ ] **Verify `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md` Completion**: Re-verify all tasks outlined in the `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md` document, as this document identifies the primary issues with organization ID context.