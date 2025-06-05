# UNIFIED_CONTROLLER_REGISTRY_PLAN.md - What Remains to Perform

This document outlines a detailed plan for the Unified Controller Registry. While core components are in place, significant work remains to fully implement all phases and functionalities.

*   **Phase 1: Core Infrastructure - Create Action Context System**:
    -   [ ] **`src/controllers/types/actionContexts.ts`**: Implement context collection and management, including user, organization, page state, navigation, and component refs. (Note: The plan mentioned `src/controllers/context/ActionContext.ts` but the existing file is `src/controllers/types/actionContexts.ts`. I will use the existing path).
    -   [ ] **`src/controllers/context/ContextProviders.tsx`**: Implement the `ContextProviders.tsx` file for React context provider components, ensuring automatic context updates and performance optimization. (Note: This file does not currently exist).
*   **Phase 2: Action Categories Implementation**:
    -   [ ] **`src/controllers/actions/NavigationActions.ts`**: Implement navigation action utilities (page navigation, route management, modal/drawer controls, breadcrumb management). (Note: This file does not currently exist).
    -   [ ] **`src/controllers/actions/DataActions.ts`**: Implement Parse Server CRUD operations, query builders/executors, bulk operation handlers, and data validation/transformation. (Note: This file does not currently exist).
    -   [ ] **`src/controllers/actions/UIActions.ts`**: Implement component state management, form controls/validation, modal/dialog management, and theme/layout controls. (Note: This file does not currently exist).
    -   [ ] **`src/controllers/actions/ExternalAPIActions.ts`**: Implement external API wrappers (Dfns, Alchemy, third-party APIs) with proper error handling and retry logic. (Note: This file does not currently exist).
*   **Phase 3: AI Integration**:
    -   [ ] **`src/components/ai-assistant/AIChatInterface.tsx` (Updated)**: Update the AI Chat Interface to include action discovery, execution confirmation dialogs, progress tracking, and result visualization.
    -   [ ] **`src/ai-assistant/AIActionDiscovery.ts`**: Implement natural language action matching, suggestion algorithms, and context-aware recommendations for AI-powered action discovery. (Note: The plan mentioned `src/ai-assistant/ActionDiscovery.ts` but typically AI components are grouped, and based on inspection, a file named `src/ai-assistant/AIActionDiscovery.ts` would be more consistent with the project's naming conventions for AI-related components.)
*   **Phase 4: Page Integration (Ongoing)**:
    -   [ ] **`src/controllers/templates/ActionTemplates.ts`**: Create action templates for common action patterns, migration helpers, and code generation utilities. (Note: This file does not currently exist).
    -   [ ] **Migration of all other pages**: Systematically convert existing handlers to registered actions for *all* other relevant pages and components, adding comprehensive action descriptions and implementing permission controls as outlined in the example implementation.
*   **Security & Permissions**:
    -   [ ] **Full Permission Manager Implementation**: Ensure `PermissionManager.ts` fully supports role-based permissions, comprehensive approval workflows (including Manager Approval, Multi-step, Time-delayed), and robust audit logging for all action executions, clearly distinguishing AI vs. human.
    -   [ ] **Integration of Approval Workflows**: Implement the full approval workflow features (e.g., `requiresApproval`, `getApprovalWorkflow`, `ApprovalWorkflow` interface, `ApprovalStep`, `EscalationRule`) defined in `src/controllers/types/permissionsAndApprovals.ts` (Note: The plan mentioned these interfaces but didn't specify a file for them. Based on existing types, `src/controllers/types/permissionsAndApprovals.ts` is the most logical location.)