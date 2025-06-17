// src/contexts/PageControllerContext.tsx

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  PageController,
  ActionDefinition,
  ActionContext,
  ActionResult,
  UserContext,
  OrganizationContext,
  NavigationContext,
  PageContext,
  ActionEvent
} from '../controllers/types/ActionTypes';
import { ControllerRegistry, controllerRegistry } from '../controllers/ControllerRegistry';
import { useAppSelector } from '../store/hooks';

/**
 * Page Controller Context interface
 */
interface PageControllerContextType {
  registry: ControllerRegistry;
  currentPageController: PageController | null;
  registerPageController: (pageController: PageController) => void;
  unregisterPageController: (pageId: string) => void;
  registerAction: (pageId: string, action: ActionDefinition) => void;
  unregisterAction: (pageId: string, actionId: string) => void;
  executeAction: (actionId: string, params: Record<string, unknown>) => Promise<ActionResult>;
  getAvailableActions: (pageId?: string) => ActionDefinition[];
  updatePageContext: (pageId: string, context: Partial<PageContext>) => void;
  getActionContext: () => ActionContext;
}

/**
 * Page Controller Context
 */
const PageControllerContext = createContext<PageControllerContextType | null>(null);

/**
 * Hook to use Page Controller Context
 */
export const usePageControllerContext = (): PageControllerContextType => {
  const context = useContext(PageControllerContext);
  if (!context) {
    throw new Error('usePageControllerContext must be used within a PageControllerProvider');
  }
  return context;
};

/**
 * Page Controller Provider Props
 */
interface PageControllerProviderProps {
  children: ReactNode;
  registry?: ControllerRegistry;
}

/**
 * Page Controller Provider Component
 */
export const PageControllerProvider: React.FC<PageControllerProviderProps> = ({
  children,
  registry = controllerRegistry
}) => {
  const router = useRouter();
  const [currentPageController, setCurrentPageController] = useState<PageController | null>(null);
  const currentPageControllerRef = useRef(currentPageController);

  useEffect(() => {
    currentPageControllerRef.current = currentPageController;
  }, [currentPageController]);
  
  // Get user context from Redux store
  const { user, orgId, permissions } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);

  /**
   * Register a page controller
   */
  const registerPageController = useCallback((pageController: PageController) => {
    try {
      registry.registerPageController(pageController);
      
      // Set as current if it matches the current route
      const currentPath = router.asPath;
      if (shouldSetAsCurrent(pageController, currentPath)) {
        setCurrentPageController(pageController);
      }
    } catch (error) {
      console.error('Failed to register page controller:', error);
    }
  }, [registry, router.asPath]);

  /**
   * Unregister a page controller
   */
  const unregisterPageController = useCallback((pageId: string) => {
    try {
      registry.unregisterPageController(pageId);
      
      // Clear current if it was the unregistered controller
      // Use functional update to avoid dependency on currentPageController
      setCurrentPageController(current => {
        if (current?.pageId === pageId) {
          return null;
        }
        return current;
      });
    } catch (error) {
      console.error('Failed to unregister page controller:', error);
    }
  }, [registry]); // Removed currentPageController from dependencies

  /**
   * Register an action to a page controller
   */
  const registerAction = useCallback((pageId: string, action: ActionDefinition) => {
    try {
      registry.registerAction(pageId, action);
      
      // Update current page controller if it's the same page
      setCurrentPageController(current => {
        if (current?.pageId === pageId) {
          const updatedController = registry.getPageController(pageId);
          return updatedController || current;
        }
        return current;
      });
    } catch (error) {
      console.error('Failed to register action:', error);
    }
  }, [registry]);

  /**
   * Unregister an action from a page controller
   */
  const unregisterAction = useCallback((pageId: string, actionId: string) => {
    try {
      registry.unregisterAction(pageId, actionId);
      
      // Update current page controller if it's the same page
      setCurrentPageController(current => {
        if (current?.pageId === pageId) {
          const updatedController = registry.getPageController(pageId);
          return updatedController || current;
        }
        return current;
      });
    } catch (error) {
      console.error('Failed to unregister action:', error);
    }
  }, [registry]);

  /**
   * Execute an action
   */
  const executeAction = useCallback(async (
    actionId: string,
    params: Record<string, unknown>
  ): Promise<ActionResult> => {
    // Debug logging to validate organization context
    console.log('[DEBUG PageControllerContext] executeAction called:', {
      actionId,
      authOrgId: orgId,
      currentOrgId: currentOrg?.id,
      currentOrgName: currentOrg?.name,
      userEmail: user?.email
    });

    // Build context inline to avoid dependency issues
    const userContext: UserContext = {
      userId: user?.id || 'anonymous',
      username: user?.email,
      email: user?.email,
      roles: [], // Roles will be derived from permissions
      permissions: permissions || ['dashboard:read', 'dashboard:write'], // Use permissions from auth state
      organizationId: orgId,
      organizationRoles: []
    };

    const organizationContext: OrganizationContext | undefined = currentOrg ? {
      id: currentOrg.id,
      name: currentOrg.name,
      settings: currentOrg.settings || {},
      permissions: [],
      features: []
    } : undefined;

    const navigationContext: NavigationContext = {
      router,
      currentPath: router.asPath,
      previousPath: router.asPath,
      breadcrumbs: generateBreadcrumbs(router.asPath)
    };

    // Use ref for currentPageController to ensure executeAction callback stability
    const currentPcFromRef = currentPageControllerRef.current;
    const pageContext: PageContext = currentPcFromRef?.context || {
      pageId: 'unknown',
      pageName: 'Unknown Page',
      state: {},
      props: {},
      metadata: {
        category: 'unknown',
        tags: [],
        permissions: []
      }
    };

    const context: ActionContext = {
      user: userContext,
      organization: organizationContext,
      page: pageContext,
      navigation: navigationContext,
      timestamp: new Date()
    };

    return registry.executeAction(actionId, params, context);
  }, [registry, user, orgId, permissions, currentOrg, router]); // Removed currentPageController state from dependencies

  /**
   * Get available actions for a page or all pages
   */
  const getAvailableActions = useCallback((pageId?: string): ActionDefinition[] => {
    if (!user) {
      return [];
    }

    const userContext: UserContext = {
      userId: user.id,
      username: user.email, // Use email as username fallback
      email: user.email,
      roles: [], // Roles will be derived from permissions
      permissions: permissions || [], // Use permissions from auth state
      organizationId: orgId || user?.organizationId,
      organizationRoles: []
    };

    if (pageId) {
      const pageActions = registry.getPageActions(pageId);
      if (!pageActions) {
        return [];
      }

      const availableActions: ActionDefinition[] = [];
      pageActions.forEach((action, actionKey) => {
        const fullActionId = `${pageId}.${actionKey}`;
        if (registry.getPermissionManager().canExecuteAction(fullActionId, userContext)) {
          availableActions.push(action);
        }
      });

      return availableActions;
    }

    return registry.getAvailableActions(userContext);
  }, [registry, user, orgId, permissions]);

  /**
   * Update page context
   */
  const updatePageContext = useCallback((pageId: string, contextUpdate: Partial<PageContext>) => {
    const controllerInRegistry = registry.getPageController(pageId);
    if (controllerInRegistry) {
      // Directly update the context of the controller instance in the registry
      const newContext = {
        ...controllerInRegistry.context,
        ...contextUpdate
      };
      controllerInRegistry.context = newContext; // Mutate the registry's copy

      // Now, if this is the currentPageController, we need to update the state
      // to trigger re-renders for consumers of currentPageController.
      setCurrentPageController(current => {
        if (current?.pageId === pageId) {
          // Return a new object based on the (now mutated) controllerInRegistry
          // to ensure React detects a state change.
          return { ...controllerInRegistry }; // Spread the updated controller from registry
        }
        return current; // Not the current page, so no change to currentPageController state
      });
    }
  }, [registry]); // currentPageController removed from dependencies

  /**
   * Get current action context
   */
  const getActionContext = useCallback((): ActionContext => {
    // Build user context
    const userContext: UserContext = {
      userId: user?.id || 'anonymous',
      username: user?.email,
      email: user?.email,
      roles: [], // Roles will be derived from permissions
      permissions: permissions || [], // Use permissions from auth state
      organizationId: orgId || user?.organizationId,
      organizationRoles: []
    };

    // Build organization context
    const organizationContext: OrganizationContext | undefined = currentOrg ? {
      id: currentOrg.id,
      name: currentOrg.name,
      settings: currentOrg.settings || {},
      permissions: [], // Will be populated from organization data
      features: [] // Will be populated from organization data
    } : undefined;

    // Build navigation context
    const navigationContext: NavigationContext = {
      router,
      currentPath: router.asPath,
      previousPath: router.asPath, // TODO: Track previous path
      breadcrumbs: generateBreadcrumbs(router.asPath)
    };

    // Build page context
    // Use ref for currentPageController to ensure getActionContext callback stability
    const currentPcFromRefForGet = currentPageControllerRef.current;
    const pageContext: PageContext = currentPcFromRefForGet?.context || {
      pageId: 'unknown',
      pageName: 'Unknown Page',
      state: {},
      props: {},
      metadata: {
        category: 'unknown',
        tags: [],
        permissions: []
      }
    };

    return {
      user: userContext,
      organization: organizationContext,
      page: pageContext,
      navigation: navigationContext,
      timestamp: new Date()
    };
  }, [user, orgId, permissions, currentOrg, router]); // Removed currentPageController state from dependencies

  /**
   * Handle route changes to update current page controller
   */
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Find page controller that matches the new route
      const pageControllers = registry.getPageControllers();
      let matchingController: PageController | null = null;

      pageControllers.forEach((controller) => {
        if (shouldSetAsCurrent(controller, url)) {
          matchingController = controller;
        }
      });

      setCurrentPageController(matchingController);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    // Set initial page controller
    handleRouteChange(router.asPath);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [registry]);

  /**
   * Set up event listeners for registry events
   */
  useEffect(() => {
    const handleRegistryEvent = (event: ActionEvent) => {
      // Handle registry events if needed
      console.log('Registry event:', event);
    };

    registry.addEventListener(handleRegistryEvent);

    return () => {
      registry.removeEventListener(handleRegistryEvent);
    };
  }, [registry]);

  const contextValue: PageControllerContextType = {
    registry,
    currentPageController,
    registerPageController,
    unregisterPageController,
    registerAction,
    unregisterAction,
    executeAction,
    getAvailableActions,
    updatePageContext,
    getActionContext
  };

  return (
    <PageControllerContext.Provider value={contextValue}>
      {children}
    </PageControllerContext.Provider>
  );
};

/**
 * Determine if a page controller should be set as current based on the route
 */
function shouldSetAsCurrent(controller: PageController, currentPath: string): boolean {
  // Simple matching logic
  const pageId = controller.pageId;
  
  // Direct match
  if (currentPath.includes(pageId)) {
    return true;
  }

  // Check if any actions in the controller match the current path
  // This is a simplified approach - in a real implementation, you might want
  // more sophisticated route matching
  return false;
}

/**
 * Generate breadcrumbs from current path
 */
function generateBreadcrumbs(currentPath: string): Array<{ label: string; path: string }> {
  const pathSegments = currentPath.split('/').filter(segment => segment.length > 0);
  const breadcrumbs: Array<{ label: string; path: string }> = [
    { label: 'Home', path: '/' }
  ];

  let currentSegmentPath = '';
  pathSegments.forEach((segment, index) => {
    currentSegmentPath += `/${segment}`;
    
    // Convert segment to readable label
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbs.push({
      label,
      path: currentSegmentPath
    });
  });

  return breadcrumbs;
}

/**
 * Hook to get the permission manager from the registry
 */
export const usePermissionManager = () => {
  const { registry } = usePageControllerContext();
  return registry.getPermissionManager();
};

/**
 * Hook to get registry statistics
 */
export const useRegistryStatistics = () => {
  const { registry } = usePageControllerContext();
  return registry.getStatistics();
};