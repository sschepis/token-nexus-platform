import { BasePageController, PageControllerConfig } from '../base/BasePageController';

/**
 * Base controller class for Marketplace functionality
 * Extends the standardized BasePageController for consistency
 */
export abstract class MarketplaceBaseController extends BasePageController {
  constructor() {
    const config: PageControllerConfig = {
      pageId: 'marketplace',
      pageName: 'Marketplace',
      description: 'Browse and manage marketplace apps, plugins, and extensions',
      category: 'marketplace',
      tags: ['marketplace', 'apps', 'plugins', 'extensions', 'store'],
      permissions: ['marketplace:read', 'marketplace:write', 'marketplace:install', 'apps:manage'],
      version: '2.0.0'
    };
    
    super(config);
  }
}