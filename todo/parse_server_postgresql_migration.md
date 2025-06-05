# Parse Server PostgreSQL Migration & Tenant Integration - Remaining Tasks Checklist

This document outlines the remaining tasks for implementing the Parse Server PostgreSQL Migration and Tenant Integration, based on the status check of `PARSE_SERVER_POSTGRESQL_MIGRATION_PLAN.md`. The majority of this large-scale architectural change is **not yet implemented**.

## I. Phase 1: Create Tenant-Aware Parse Database Adapter (CRITICAL)

- [ ] **1.1 Create Custom PostgreSQL Adapter**:
    - [ ] Create the file `parse-server/src/adapters/TenantAwarePostgresAdapter.js`.
    - [ ] Implement the `TenantAwarePostgresAdapter` class, extending `@parse/postgres-storage-adapter.PostgresStorageAdapter`, to override methods like `_ensureSchemaCollectionExists`, `connect`, `find`, `create`, `update`, `destroy` to ensure tenant context is applied through `SET search_path`.
    - [ ] Implement the `getCurrentTenantId()` method within the adapter to extract the tenant ID from `global.currentTenantId` or environment variables.
- [ ] **1.2 Create Tenant Context Injection Middleware**:
    - [ ] Create the file `parse-server/src/middleware/parseServerTenantContext.js`.
    - [ ] Implement the `ParseServerTenantContext` class, providing an Express-compatible middleware (`middleware()`).
    - [ ] This middleware should extract the tenant ID from the request (e.g., subdomain, headers, authenticated user), validate tenant access, and set `global.currentTenantId` for subsequent Parse operations and the custom adapter.

## II. Phase 2: Update Parse Server Configuration (CRITICAL)

- [ ] **2.1 Update Server Initialization**:
    - [ ] Modify the main Parse Server initialization file (likely `parse-server/index.js` or a core `server.js` file) to:
        - [ ] Import `TenantAwarePostgresAdapter` and `ParseServerTenantContext`.
        - [ ] Initialize a `DatabaseManager` (if not already present).
        - [ ] Configure the `ParseServer` instance to use the `TenantAwarePostgresAdapter` as its `databaseAdapter`.
        - [ ] Remove any existing MongoDB `databaseURI` configuration.
        - [ ] Apply the `ParseServerTenantContext` middleware to the Parse Server routes (e.g., `app.use('/parse', this.parseTenantContext.middleware());`).
- [ ] **2.2 Update Configuration File**:
    - [ ] Locate and modify the Parse Server configuration file (e.g., `parse-server/src/config.js` or similar) to:
        - [ ] Remove MongoDB-specific configuration.
        - [ ] Add explicit PostgreSQL connection details (host, port, database, user, password, connectionString).

## III. Phase 3: Data Migration Strategy (CRITICAL)

- [ ] **3.1 Create Migration Scripts**:
    - [ ] Create the directory `parse-server/scripts/`.
    - [ ] Create the migration script file `parse-server/scripts/migrateToPostgreSQL.js`.
    - [ ] Implement the `ParseToPostgreSQLMigrator` class within this script. This class should be capable of:
        - [ ] Connecting to both the source MongoDB and the target PostgreSQL databases.
        - [ ] Iterating through each Parse class in MongoDB.
        - [ ] Fetching objects in batches from MongoDB.
        - [ ] Grouping objects by their respective `organizationId` (or `organization` pointer).
        - [ ] For each organization, inserting the objects into its dedicated PostgreSQL schema (e.g., `org_tenantId`).
        - [ ] Handling the conversion of Parse object attributes (including pointers, arrays, objects) to PostgreSQL-compatible formats.
        - [ ] Implementing idempotency to allow re-runs of the migration.

## IV. Phase 4: Update Cloud Functions

- [ ] **4.1 Remove Explicit Organization Filtering**:
    - [ ] Once the schema-separated multi-tenancy is functional, review and modify existing Parse Cloud Functions (e.g., `getOrganizationProfile` as per the plan's example, and any other functions that currently explicitly filter queries by `organizationId` or `organization` pointer).
    - [ ] Remove the explicit filtering logic, relying on the `TenantAwarePostgresAdapter` and tenant context middleware to automatically enforce data isolation based on the `search_path`.

## V. Phase 5: Testing Strategy

- [ ] **5.1 Create Tenant Isolation Tests**:
    - [ ] Create the directory `parse-server/tests/`.
    - [ ] Create `parse-server/tests/tenantIsolation.test.js`.
    - [ ] Implement comprehensive unit tests for `TenantAwarePostgresAdapter` and `ParseServerTenantContext` middleware.
    - [ ] Develop integration tests to verify that Parse Server queries consistently respect tenant boundaries, ensuring data written by one tenant is not accessible by another except through explicit relationships.
    - [ ] Implement end-to-end tests for core application flows to confirm seamless operation post-migration and with multi-tenancy.

## VI. Missing Files/Directories (To Be Created)

- [ ] `parse-server/src/adapters/` (directory needs to be created)
- [ ] `parse-server/src/adapters/TenantAwarePostgresAdapter.js`
- [ ] `parse-server/src/middleware/parseServerTenantContext.js`
- [ ] `parse-server/scripts/` (directory needs to be created)
- [ ] `parse-server/scripts/migrateToPostgreSQL.js`
- [ ] `parse-server/tests/` (directory needs to be created)
- [ ] `parse-server/tests/tenantIsolation.test.js`
- [ ] Core Parse Server configuration files might need creation or substantial modification, as inferred from the plan.