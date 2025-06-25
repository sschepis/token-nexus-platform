import { BasePageController } from './base/BasePageController';
import { fetchRoutesAction } from './routes/management/fetchRoutes';
import { addRouteAction } from './routes/management/addRoute';
import { updateRouteAction } from './routes/management/updateRoute';
import { deleteRouteAction } from './routes/management/deleteRoute';
import { toggleRouteStatusAction } from './routes/management/toggleRouteStatus';
import { getRouteDetailsAction } from './routes/management/getRouteDetails';

export class RoutesPageController extends BasePageController {
  constructor() {
    super({
      pageId: 'routes',
      pageName: 'Routes Management',
      description: 'Manage application routes, endpoints, and navigation',
      category: 'system',
      tags: ['routes', 'navigation', 'management', 'system'],
      permissions: ['routes:read'],
      version: '1.0.0'
    });
  }

  protected initializeActions(): void {
    this.registerActionDefinition(fetchRoutesAction);
    this.registerActionDefinition(addRouteAction);
    this.registerActionDefinition(updateRouteAction);
    this.registerActionDefinition(deleteRouteAction);
    this.registerActionDefinition(toggleRouteStatusAction);
    this.registerActionDefinition(getRouteDetailsAction);
  }
}

export const routesPageController = new RoutesPageController();