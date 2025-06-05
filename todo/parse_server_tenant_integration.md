# Parse Server Tenant Integration Plan - Remaining Tasks Checklist

This document outlines the remaining tasks for implementing the Parse Server Tenant Integration, based on the status check of `PARSE_SERVER_TENANT_INTEGRATION_PLAN.md`. This plan describes significant architectural changes, with the majority of the work remaining.

## I. Phase 1: Fix Immediate Parameter Mismatch (HIGH PRIORITY)

- [ ] **1. Update Frontend to use `organizationId` consistently**:
    - [ ] Modify `src/store/slices/orgSlice.ts`: In the `fetchCurrentOrgDetails` thunk, explicitly change the parameter name passed to `Parse.Cloud.run('getOrganizationProfile', ...)` from `orgId` to `organizationId`. Example: `Parse.Cloud.run('getOrganizationProfile', { organizationId: orgId });`.
    - [ ] Conduct a comprehensive review of all other Parse Cloud Function calls across the frontend (`src/store/slices/`, `src/services/api/`, `src/parse/parseService.ts`) to ensure consistent parameter naming (`organizationId`) wherever the backend expects it.

## II. Phase 2: Integrate Parse Server with Tenant System (MEDIUM PRIORITY, Major Architectural Work)

This phase involves integrating Parse Server with a schema-separated multi-tenant system, largely overlapping with tasks in `PARSE_SERVER_POSTGRESQL_MIGRATION_PLAN.md`.

- [ ] **1. Create Parse Server Tenant-Aware Database Adapter**:
    - [ ] Create the file `parse-server/src/adapters/TenantAwareDatabaseAdapter.js` (as specified in the plan's code snippet).
    - [ ] Implement the `TenantAwareDatabaseAdapter` class, extending Parse Server's `PostgresStorageAdapter`, to dynamically set the PostgreSQL `search_path` to the tenant-specific schema (`org_${tenantId}`) for all database operations (find, create, update, destroy).
    - [ ] Implement the `getCurrentTenantId()` method within this adapter, which should retrieve the tenant ID from `global.currentTenantId` (set by the tenant context middleware).
- [ ] **2. Apply Tenant Middleware to Parse Routes**:
    - [ ] Ensure or create a Parse Server middleware (e.g., `parse-server/src/middleware/parseServerTenantContext.js` as in `ORGANIZATION_ID_CONTEXT_FIX_PLAN.md`) that systematically extracts the tenant ID from incoming requests (e.g., from authenticated user session, URL, or headers).
    - [ ] This middleware should:
        -   Validate tenant access.
        -   Set `global.currentTenantId` before Parse Server processes the request.
        -   Be applied to all Parse Server routes (e.g., `app.use('/parse', tenantContext.middleware());`).
- [ ] **3. Migrate Parse Data to Schema-Separated Structure**:
    - [ ] Perform the full data migration from existing MongoDB (or single-schema PostgreSQL) to PostgreSQL with schema separation. This involves creating the migration script (`parse-server/scripts/migrateToPostgreSQL.js`) and executing it as detailed in `PARSE_SERVER_POSTGRESQL_MIGRATION_PLAN.md`.
- [ ] **4. Update Parse Server Configuration**:
    - [ ] Modify the Parse Server's main configuration to:
        -   Remove MongoDB-specific `databaseURI`.
        -   Configure the `databaseAdapter` to use the new `TenantAwareDatabaseAdapter`.
        -   Ensure PostgreSQL connection details are correctly configured.

## III. Phase 3: Eliminate Redundant Organization Filtering (LOW PRIORITY, Cleanup)

This phase is dependent on the completion of Phase 2.

- [ ] **1. Remove Explicit Organization Filters from Controllers**:
    - [ ] Once the schema-separated multi-tenancy is fully operational and verified, review frontend custom page controllers and remove any explicit `organizationId` filters (`query.equalTo('organizationId', orgId)`) that were manually added, as data will now be isolated by schema.
- [ ] **2. Update Cloud Functions for Schema Separation**:
    - [ ] Similarly, review existing Parse Cloud Functions and remove explicit organization validation or filtering logic that will become redundant due to database-level tenant isolation.

## IV. Missing Files and Directories (To Be Created)

- [ ] `parse-server/src/adapters/TenantAwareDatabaseAdapter.js`
- [ ] `parse-server/src/middleware/parseServerTenantContext.js` (or similar file for tenant context middleware)
- [ ] `parse-server/scripts/migrateToPostgreSQL.js` (for data migration)