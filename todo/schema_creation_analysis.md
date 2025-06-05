# Schema Creation Functionality - Remaining Tasks Checklist

This document outlines the remaining tasks for resolving schema creation conflicts and issues, based on the status check of `SCHEMA_CREATION_ANALYSIS.md`. The core recommendations and fixes are **unimplemented**.

## I. Consolidate & Refactor `ensureCoreSchemas` Cloud Function (CRITICAL)

The `ensureCoreSchemas` cloud function in `parse-server/cloud/functions/schemas.js` relies on a problematic import and incorrect function signature. This function must be refactored to be the authoritative source for schema definition.

- [ ] **Remove Problematic Import**:
    - [ ] In `parse-server/cloud/functions/schemas.js`, remove the line:
        ```javascript
        const { createSchema } = require('../../../src/deploy');
        ```
- [ ] **Implement Direct Schema Creation/Update Logic**:
    - [ ] Modify the loop that iterates over the `coreSchemas` array within the `ensureCoreSchemas` function (`Parse.Cloud.define('ensureCoreSchemas', async (request) => { ... })`).
    - [ ] Inside this loop, for each `schemaConfig` (which contains `className`, `fields`, `classLevelPermissions`, `indexes`):
        - [ ] Attempt to retrieve the existing schema definition using `Parse.Schema(schemaConfig.className).get()`. Handle `Parse.Error.OBJECT_NOT_FOUND` to indicate a new schema.
        - [ ] If new, create `const schema = new Parse.Schema(schemaConfig.className);`.
        - [ ] If existing, use the retrieved `schema` object.
        - [ ] Iterate through `schemaConfig.fields` and use `schema.addField(fieldName, fieldConfig)` or `schema.updateField(fieldName, fieldConfig)` to define/update fields. Ensure checks for existing fields before adding.
        - [ ] Set Class-Level Permissions (CLPs) using `schema.setCLP(schemaConfig.classLevelPermissions)`.
        - [ ] Add indexes by iterating through `schemaConfig.indexes` and using `schema.addIndex(indexName, indexDefinition)`.
        - [ ] Finally, save or update the schema using `await schema.save({ useMasterKey: true });` or `await schema.update({ useMasterKey: true });`.
        - [ ] Implement robust error handling for schema operations.

## II. Review and Clarify Purpose of `src/deploy/schemaManagement.ts` and `src/parse/parseService.ts` (`createSchemas`)

These files contain alternative schema creation mechanisms that conflict with the authoritative cloud code approach.

- [ ] **Review `src/deploy/schemaManagement.ts`**:
    - [ ] Examine `src/deploy/schemaManagement.ts`. If its `async function createSchema()` (which takes no parameters and calls `createSchemas` from `parseService.ts`) is now redundant given the refactoring of `ensureCoreSchemas`, it should be deprecated or removed.
- [ ] **Review `src/parse/parseService.ts` (`createSchemas`)**:
    - [ ] Examine `src/parse/parseService.ts`. If the `async function createSchemas(schemaNames: string[])` (plural) is redundant or serves only a very basic "ensure class name exists" purpose without defining structure, clarify its documentation or mark it for deprecation/removal. Ensure the commented-out `schema.create()` logic does not cause unintended behavior.

## III. Address TypeScript/JavaScript Interoperability (Long-term Architectural Debt)

The attempt by Parse Server cloud code (JavaScript) to directly `require` TypeScript source files from the main `src/` application is problematic.

- [ ] **Establish Clear Build Process for Shared Modules**:
    - [ ] If there is a legitimate need for shared code between the Next.js frontend (TypeScript) and Parse Server cloud (JavaScript), establish a proper build pipeline. This pipeline should compile the shared TypeScript code into distributable JavaScript files that are reliably accessible and `require`-able by the Parse Server cloud code.
    - [ ] Consider setting up a dedicated shared library (e.g., in a `packages/common` directory with its own build script) or ensuring the Next.js build output includes a compiled version of `src/deploy` that the cloud code can access.