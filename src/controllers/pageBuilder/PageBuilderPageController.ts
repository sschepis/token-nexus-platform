import { PageBuilderBaseController } from './PageBuilderBaseController';
import { PageActions, PreviewActions, SecurityActions } from './actions';

/**
 * Main Page Builder controller that orchestrates all page builder functionality
 * This controller is refactored from the original monolithic implementation
 * into smaller, more manageable modules for better maintainability
 */
export class PageBuilderPageController extends PageBuilderBaseController {
  /**
   * Initialize all actions by delegating to specialized action modules
   */
  protected initializeActions(): void {
    // Register page CRUD actions
    const fetchPagesAction = PageActions.createFetchPagesAction();
    this.registerAction(fetchPagesAction.config, fetchPagesAction.executor);
    
    const createPageAction = PageActions.createCreatePageAction();
    this.registerAction(createPageAction.config, createPageAction.executor);
    
    const updatePageAction = PageActions.createUpdatePageAction();
    this.registerAction(updatePageAction.config, updatePageAction.executor);
    
    const deletePageAction = PageActions.createDeletePageAction();
    this.registerAction(deletePageAction.config, deletePageAction.executor);

    // Register preview actions
    const previewPageAction = PreviewActions.createPreviewPageAction();
    this.registerAction(previewPageAction.config, previewPageAction.executor);

    // Register security actions
    const generateTokenAction = SecurityActions.createGenerateTokenAction();
    this.registerAction(generateTokenAction.config, generateTokenAction.executor);
  }
}

// Export singleton instance
export const pageBuilderPageController = new PageBuilderPageController();