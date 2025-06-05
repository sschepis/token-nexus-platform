# Organization Selector Fix - Remaining Tasks Checklist

This document outlines the remaining tasks for implementing the Organization Selector Fix, based on the status check of `ORGANIZATION_SELECTOR_FIX_PLAN.md`. This fix addresses the issue of `orgId: null` due to malformed `currentOrganization` fields.

## I. Phase 1: Backend Data Handling Fix (CRITICAL & INCOMPLETE)

- [ ] **Locate/Implement `customUserLogin` Cloud Function**:
    - [ ] Identify the location of the `customUserLogin` cloud function. (It was not found in `parse-server/cloud/functions/auth/index.js` as expected, suggesting it might be in another file, or needs to be created/moved to this file).
    - [ ] Ensure or implement this function as a `Parse.Cloud.define`.
- [ ] **Implement Enhanced `currentOrganization` Parsing**:
    - [ ] Within the `customUserLogin` cloud function, replace the existing `orgId` extraction logic with robust parsing. This logic should handle:
        -   String IDs (malformed data).
        -   Proper Parse Pointer objects (extracting `.id`).
        -   Objects with `.objectId`.
        -   Parse Objects using `.get('objectId')`.
- [ ] **Implement Data Validation and Repair**:
    - [ ] Add logic within `customUserLogin` to validate if the extracted `orgId` corresponds to an existing `Organization` object.
    - [ ] If a valid organization is found but the `currentOrganization` field on the user is a string (malformed), update `user.set("currentOrganization", validOrg)` to convert the string ID to a proper Parse Pointer and `await user.save()`.
- [ ] **Implement Robust Fallback Mechanism**:
    - [ ] If no valid `orgId` is found or repaired from `currentOrganization` (e.g., it's `null` or points to a non-existent organization), implement the fallback logic.
    - [ ] Query the user’s `organizations` relation (e.g., `user.relation("organizations").query()`) to find all organizations the user belongs to.
    - [ ] If the user belongs to one or more organizations, automatically set the first organization from this list as the `currentOrganization` for the user (`user.set("currentOrganization", firstOrg)` and `await user.save()`).

## II. Phase 3: Data Consistency & Migration (INCOMPLETE)

- [ ] **Create Data Repair Utility**:
    - [ ] Implement the `Parse.Cloud.define("repairUserOrganizationData", async (request) => { ... })` cloud function as described in the plan.
    - [ ] This function should be accessible only by system administrators (`user.get('isSystemAdmin')`).
    - [ ] Its purpose is to query all users, identify those with malformed `currentOrganization` fields (e.g., string IDs), then fetch the correct `Organization` Parse Pointer and repair the user's `currentOrganization` field.
    - [ ] It should return a summary of `repairedCount` and `totalUsers`.