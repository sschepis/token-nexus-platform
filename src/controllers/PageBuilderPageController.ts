/**
 * Legacy export for backward compatibility
 * The PageBuilderPageController has been refactored into multiple smaller files
 * for better maintainability. This file now re-exports from the new structure.
 * 
 * New structure:
 * - src/controllers/pageBuilder/PageBuilderBaseController.ts - Base controller class
 * - src/controllers/pageBuilder/actions/PageActions.ts - CRUD operations
 * - src/controllers/pageBuilder/actions/PreviewActions.ts - Preview functionality
 * - src/controllers/pageBuilder/actions/SecurityActions.ts - Token generation
 * - src/controllers/pageBuilder/PageBuilderPageController.ts - Main orchestrator
 */

export { 
  PageBuilderPageController, 
  pageBuilderPageController 
} from './pageBuilder/PageBuilderPageController';