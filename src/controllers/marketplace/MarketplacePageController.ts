import { MarketplaceBaseController } from './MarketplaceBaseController';
import {
  getBrowseMarketplaceAction,
  getMarketplaceCategoriesAction,
  getAppDetailsAction
} from './actions/MarketplaceActions';
import {
  getInstallAppAction,
  getUninstallAppAction,
  getInstalledAppsAction,
  getUpdateAppSettingsAction
} from './actions/InstallationActions';

/**
 * Marketplace Page Controller
 * Manages marketplace browsing, app installation, and app management functionality
 * Extends MarketplaceBaseController which provides standardized BasePageController functionality
 */
export class MarketplacePageController extends MarketplaceBaseController {
  
  protected initializeActions(): void {
    // Marketplace browsing actions
    const browseAction = getBrowseMarketplaceAction();
    this.registerAction(browseAction.config, browseAction.executor);

    const categoriesAction = getMarketplaceCategoriesAction();
    this.registerAction(categoriesAction.config, categoriesAction.executor);

    const appDetailsAction = getAppDetailsAction();
    this.registerAction(appDetailsAction.config, appDetailsAction.executor);

    // Installation management actions
    const installAction = getInstallAppAction();
    this.registerAction(installAction.config, installAction.executor);

    const uninstallAction = getUninstallAppAction();
    this.registerAction(uninstallAction.config, uninstallAction.executor);

    const installedAppsAction = getInstalledAppsAction();
    this.registerAction(installedAppsAction.config, installedAppsAction.executor);

    const updateSettingsAction = getUpdateAppSettingsAction();
    this.registerAction(updateSettingsAction.config, updateSettingsAction.executor);
  }
}

// Export singleton instance
export const marketplacePageController = new MarketplacePageController();