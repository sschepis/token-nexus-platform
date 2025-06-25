import { BasePageController } from '../base/BasePageController';

/**
 * Base controller class for Page Builder functionality
 * Extends the standardized BasePageController for consistency
 */
export abstract class PageBuilderBaseController extends BasePageController {
  constructor() {
    super({
      pageId: 'page-builder',
      pageName: 'Page Builder',
      description: 'Visual page builder for creating custom application pages',
      category: 'development',
      tags: ['pages', 'builder', 'visual', 'components'],
      permissions: ['pages:read', 'pages:write', 'components:read', 'pagebuilder:read', 'pagebuilder:write', 'pagebuilder:manage', 'system:admin'],
      version: '1.0.0'
    });
  }

  /**
   * Abstract method to be implemented by concrete controllers
   * to initialize their specific actions
   */
  protected abstract initializeActions(): void;
}