# Organization ID Context Fix - Remaining Tasks Checklist

This document outlines the remaining tasks for implementing the Organization ID Context Fix, based on the status check of `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md`.

## I. Phase 1: Create Reusable Organization Context Middleware (CRITICAL)

- [ ] **Create Middleware File**:
    - [ ] Create the file `parse-server/cloud/middleware/organizationContextMiddleware.js`.
- [ ] **Implement `getUserOrganization` Helper**:
    - [ ] Implement the `async function getUserOrganization(user)` as described in the plan's code snippet. This helper should robustly fetch the user's current organization by checking:
        1.  `user.get('currentOrganizationId')` (string field)
        2.  `user.get('currentOrganization')` (pointer field)
        3.  Fallback to querying `Parse.Query('Organization').equalTo('users', user)` if the above fields are null/undefined.
- [ ] **Implement `withOrganizationContext` Middleware**:
    - [ ] Implement the `async function withOrganizationContext(request)` within the `organizationContextMiddleware.js` file.
    - [ ] This middleware should:
        - [ ] Skip for system admin functions or master key requests.
        - [ ] Call `getUserOrganization` to retrieve the relevant organizationfor the authenticated user.
        - [ ] Inject the `organizationId` and the full `organization` object into `request.params` and `request` object.
- [ ] **Export the Middleware**:
    - [ ] Ensure `module.exports = { withOrganizationContext, getUserOrganization };` is set up.

## II. Phase 2 & 3: Update Cloud Functions & Frontend Calls (CRITICAL)

- [ ] **Apply Middleware to High-Priority Cloud Functions**:
    - [ ] For each of the following cloud functions, modify the file to:
        1.  Import the middleware: `const { withOrganizationContext } = require('../middleware/organizationContextMiddleware');` (adjust path as needed).
        2.  Apply the middleware at the beginning of the function: `request = await withOrganizationContext(request);`.
        3.  Remove any redundant explicit `organizationId` checks (`if (!organizationId) { throw new Error(...); }`).

    - **Target Cloud Functions**:
        - [ ] `parse-server/cloud/functions/dashboard.js`
        - [ ] `parse-server/cloud/functions/orgManagement.js`
        - [ ] `parse-server/cloud/functions/application/index.js`
        - [ ] `parse-server/cloud/functions/globalOrgManagement.js`
        - [ ] `parse-server/cloud/functions/organizations.js` (apply to functions that require organization context, e.g., `listOrganizationsForAdmin`, `getUserDetails`, etc.)
        - [ ] `parse-server/cloud/functions/orgAppInstallations.js`
        - [ ] `parse-server/cloud/functions/organization/index.js`

- [ ] **Frontend Updates (`parseService.ts`)**:
    - [ ] Review `src/parse/parseService.ts` and ensure that explicit `organizationId` parameters are removed from cloud function calls where the newly implemented backend middleware is robustly handling context injection. This needs a function-by-function verification.
    - [ ] Verify `src/store/slices/orgSlice.ts` to ensure `setCurrentOrganization` correctly interacts with the backend without passing the `orgId` in parameters (as it already expects the middleware).

## III. Testing and Validation (Post-Implementation)

- [ ] **Unit Tests**:
    - [ ] Develop unit tests for `organizationContextMiddleware.js` covering all `getUserOrganization` scenarios (user with `currentOrganizationId`, user with `currentOrganization` pointer, user via organization.users relation, user with no organization).
- [ ] **Integration Tests**:
    - [ ] Conduct integration tests for each modified cloud function to ensure organization context is correctly injected and used, and that the functions behave as expected without explicit `organizationId` parameters from the frontend.
- [ ] **End-to-End Tests**:
    - [ ] Perform E2E tests on all affected pages (`dashboard`, `users`, `tokens`, `settings`, and any other pages that previously displayed "Organization ID is required" errors) to confirm the fix across the entire application flow.
- [ ] **Edge Cases**:
    - [ ] Explicitly test system admin functions and master key requests to confirm the middleware correctly skips them.
    - [ ] Test scenarios where a user has no associated organizations.
- [ ] **Verify Fix**:
    - [ ] Confirm that "Organization ID is required" errors are completely eliminated.
    - [ ] Ensure no regression in existing functionality.