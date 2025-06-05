# Mock API Implementation - Remaining Tasks Checklist

This document outlines the remaining tasks for replacing mock API implementations with real Parse Cloud Function-based APIs, based on the status check of `MOCK_API_IMPLEMENTATION_PLAN.md`.

## I. Phase 6: Replace Mock Data Components (HIGH PRIORITY)

- [ ] **Reports Page (`src/pages/reports.tsx`)**:
    - [ ] Replace hardcoded chart data (`tokenActivityData`, `userActivityData`, `transactionsByTypeData`, `usersByRoleData`, `apiUsageData`) with dynamic data fetched from real Parse APIs or appropriate backend services. This requires fetching and processing real report data using the `generateReport` and `getReports` cloud functions.
- [ ] **Component Library (`src/components/pages/ComponentLibrary.tsx`)**:
    - [ ] Update the `useQuery` for `customComponents` and `customObjects` to fetch data directly from the Parse database instead of using static mock data.
- [ ] **Object Manager (`src/components/pages/ObjectManager.tsx`)**:
    - [ ] Update the `useQuery` for `customObjects` to fetch data directly from the Parse database instead of using static mock data.
- [ ] **Page Builder (`src/components/pages/PageBuilder.tsx`)**:
    - [ ] Update the `useQuery` for `customObjects` to fetch data directly from the Parse database instead of using static mock data. (Note: The Page Builder already uses real Parse functions for page and component management; this specific item targets the *objects* it can integrate).
- [ ] **Object Record Viewer (`src/components/object-manager/ObjectRecordViewer.tsx`)**:
    - [ ] Update the `useQuery` for `records` and `fields` to fetch actual record data and field definitions from the Parse backend for the selected custom object, instead of using static mock data.

## II. Phase 7: Create AI Assistant Components (HIGH PRIORITY)

- [ ] **Scheduled Task List Component**:
    - [ ] Create the React component `src/components/ai-assistant/ScheduledTaskList.tsx`. This component should be responsible for displaying a list of scheduled AI tasks, including their execution status, history, and providing UI for task management (e.g., enable/disable, delete).
- [ ] **Create Scheduled Task Form Component**:
    - [ ] Create the React component `src/components/ai-assistant/CreateScheduledTaskForm.tsx`. This component should provide a form to create new scheduled AI tasks, including fields for task name, description, cron expression, and action configuration.
- [ ] **Parse Schema Requirement**:
    - [ ] Ensure the `ScheduledTask` Parse Class schema, as defined in the plan, is fully implemented in the Parse Server. This includes fields like `name`, `description`, `cronExpression`, `actionDetails`, `organization`, `createdBy`, `isActive`, `lastRun`, `nextRun`, and `createdAt`.