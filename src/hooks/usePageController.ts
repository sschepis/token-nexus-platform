// src/hooks/usePageController.ts

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  ActionDefinition,
  PageController,
  ActionResult,
  PageContext
} from '../controllers/types/ActionTypes';
import { usePageControllerContext } from '../contexts/PageControllerContext';

/**
 * Options for usePageController hook
 */
export interface UsePageControllerOptions {
  pageId: string;
  pageName: string;
  description?: string;
  category?: string;
  permissions?: string[];
  tags?: string[];
}

/**
 * Return type for usePageController hook
 */
export interface UsePageControllerReturn {
  registerAction: (action: ActionDefinition) => void;
  unregisterAction: (actionId: string) => void;
  executeAction: (actionId: string, params: Record<string, unknown>) => Promise<ActionResult>;
  getAvailableActions: () => ActionDefinition[];
  updatePageState: (state: Record<string, unknown>) => void;
  updatePageProps: (props: Record<string, unknown>) => void;
  pageController: PageController | null;
  isRegistered: boolean; // Derived directly from pageController !== null
}

/**
 * Hook for pages to register and manage their actions
 */
export const usePageController = (options: UsePageControllerOptions): UsePageControllerReturn => {
  const router = useRouter();
  const {
    registerPageController,
    unregisterPageController,
    registerAction: contextRegisterAction,
    unregisterAction: contextUnregisterAction,
    executeAction: contextExecuteAction,
    getAvailableActions: contextGetAvailableActions,
    updatePageContext,
    registry
  } = usePageControllerContext();

  const [pageState, setPageState] = useState<Record<string, unknown>>({});
  const [pageProps, setPageProps] = useState<Record<string, unknown>>({});
  const registeredActionsRef = useRef<Set<string>>(new Set());

  const {
    pageId,
    pageName,
    description = '',
    category = 'general',
    permissions = [],
    tags = []
  } = options;

  // Use a ref to store the latest registered controller instance (not used for direct state management)
  const registeredControllerRef = useRef<PageController | null>(null);

  // Memoized pageController - it will update as the registry updates
  const pageController = useMemo(() => {
    const controller = registry.getPageController(pageId);
    registeredControllerRef.current = controller; // Keep ref updated
    return controller || null;
  }, [registry, pageId]);

  const isRegistered = !!pageController; // Derived state

  // Effect to update page context when state or props change
  useEffect(() => {
    // Only update page context if the page controller is actually registered
    if (pageController) {
      const updatedContext: Partial<PageContext> = {
        state: pageState,
        props: pageProps
      };
      updatePageContext(pageId, updatedContext);
    }
  }, [pageState, pageProps, pageController, pageId, updatePageContext]); // Removed isRegistered as dependency

  // Cleanup effect: Only unregister actions added by this particular hook instance.
  useEffect(() => {
    return () => {
      registeredActionsRef.current.forEach(actionId => {
        try {
          if (registeredActionsRef.current.has(actionId)) { // Prevent unregistering actions not added by THIS hook
            contextUnregisterAction(pageId, actionId);
          }
        } catch (error) {
          console.error(`Failed to unregister action ${actionId} for page ${pageId} during cleanup:`, error);
        }
      });
    };
  }, [pageId, contextUnregisterAction]);


  /**
   * Register an action
   */
  const registerAction = useCallback((action: ActionDefinition) => {
    if (!pageController) { // Check directly against the memoized controller
      console.warn(`Cannot register action ${action.id}: page controller not yet registered.`);
      return;
    }

    try {
      // Validate action ID uniqueness within this page
      if (registeredActionsRef.current.has(action.id)) {
        console.warn(`Action ${action.id} is already registered for page ${pageId}`);
        return;
      }

      contextRegisterAction(pageId, action);
      registeredActionsRef.current.add(action.id);
      
      console.log(`Registered action: ${pageId}.${action.id}`);
    } catch (error) {
      console.error(`Failed to register action ${action.id}:`, error);
    }
  }, [isRegistered, pageId, contextRegisterAction]);

  /**
   * Unregister an action
   */
  const unregisterAction = useCallback((actionId: string) => {
    if (!registeredActionsRef.current.has(actionId)) {
      console.warn(`Action ${actionId} is not registered for page ${pageId}`);
      return;
    }

    try {
      contextUnregisterAction(pageId, actionId);
      registeredActionsRef.current.delete(actionId);
      
      console.log(`Unregistered action: ${pageId}.${actionId}`);
    } catch (error) {
      console.error(`Failed to unregister action ${actionId}:`, error);
    }
  }, [pageId, contextUnregisterAction]);

  /**
   * Execute an action
   */
  const executeAction = useCallback(async (
    actionId: string,
    params: Record<string, unknown>
  ): Promise<ActionResult> => {
    const fullActionId = actionId.includes('.') ? actionId : `${pageId}.${actionId}`;
    return contextExecuteAction(fullActionId, params);
  }, [pageId, contextExecuteAction]);

  /**
   * Get available actions for this page
   */
  const getAvailableActions = useCallback((): ActionDefinition[] => {
    return contextGetAvailableActions(pageId);
  }, [pageId, contextGetAvailableActions]);

  /**
   * Update page state
   */
  const updatePageState = useCallback((newState: Record<string, unknown>) => {
    setPageState(prevState => ({
      ...prevState,
      ...newState
    }));
  }, []);

  /**
   * Update page props
   */
  const updatePageProps = useCallback((newProps: Record<string, unknown>) => {
    setPageProps(prevProps => ({
      ...prevProps,
      ...newProps
    }));
  }, []);


  return {
    registerAction,
    unregisterAction,
    executeAction,
    getAvailableActions,
    updatePageState,
    updatePageProps,
    pageController,
    isRegistered
  };
};

/**
 * Hook to create a navigation action
 */
export const useNavigationAction = (
  pageController: UsePageControllerReturn,
  actionId: string,
  name: string,
  description: string,
  targetPath: string,
  permissions: string[] = []
) => {
  const router = useRouter();

  useEffect(() => {
    const action: ActionDefinition = {
      id: actionId,
      name,
      description,
      category: 'navigation',
      permissions,
      parameters: [
        {
          name: 'replace',
          type: 'boolean',
          required: false,
          description: 'Whether to replace the current history entry',
          defaultValue: false
        }
      ],
      execute: async (params, context) => {
        const { replace = false } = params;
        
        if (replace) {
          await router.replace(targetPath);
        } else {
          await router.push(targetPath);
        }

        return {
          success: true,
          message: `Navigated to ${targetPath}`,
          data: { targetPath, replace }
        };
      },
      metadata: {
        tags: ['navigation'],
        examples: [
          {
            params: {},
            description: `Navigate to ${targetPath}`
          },
          {
            params: { replace: true },
            description: `Replace current page with ${targetPath}`
          }
        ],
        relatedActions: []
      }
    };

    pageController.registerAction(action);

    return () => {
      pageController.unregisterAction(actionId);
    };
  }, [pageController, actionId, name, description, targetPath, permissions, router]);

  return useCallback((replace: boolean = false) => {
    return pageController.executeAction(actionId, { replace });
  }, [pageController, actionId]);
};

/**
 * Hook to create a data operation action
 */
export const useDataAction = (
  pageController: UsePageControllerReturn,
  actionId: string,
  name: string,
  description: string,
  operation: (params: Record<string, unknown>) => Promise<unknown>,
  parameters: ActionDefinition['parameters'] = [],
  permissions: string[] = []
) => {
  useEffect(() => {
    const action: ActionDefinition = {
      id: actionId,
      name,
      description,
      category: 'data',
      permissions,
      parameters,
      execute: async (params, context) => {
        try {
          const result = await operation(params);
          return {
            success: true,
            data: result,
            message: `${name} completed successfully`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            success: false,
            error: errorMessage,
            message: `${name} failed: ${errorMessage}`
          };
        }
      },
      metadata: {
        tags: ['data'],
        examples: [],
        relatedActions: []
      }
    };

    pageController.registerAction(action);

    return () => {
      pageController.unregisterAction(actionId);
    };
  }, [pageController, actionId, name, description, operation, parameters, permissions]);

  return useCallback((params: Record<string, unknown> = {}) => {
    return pageController.executeAction(actionId, params);
  }, [pageController, actionId]);
};

/**
 * Hook to create a UI state action
 */
export const useUIAction = (
  pageController: UsePageControllerReturn,
  actionId: string,
  name: string,
  description: string,
  stateUpdater: (params: Record<string, unknown>) => void,
  parameters: ActionDefinition['parameters'] = [],
  permissions: string[] = []
) => {
  useEffect(() => {
    const action: ActionDefinition = {
      id: actionId,
      name,
      description,
      category: 'ui',
      permissions,
      parameters,
      execute: async (params, context) => {
        try {
          stateUpdater(params);
          return {
            success: true,
            message: `${name} completed successfully`,
            data: params
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return {
            success: false,
            error: errorMessage,
            message: `${name} failed: ${errorMessage}`
          };
        }
      },
      metadata: {
        tags: ['ui', 'state'],
        examples: [],
        relatedActions: []
      }
    };

    pageController.registerAction(action);

    return () => {
      pageController.unregisterAction(actionId);
    };
  }, [pageController, actionId, name, description, stateUpdater, parameters, permissions]);

  return useCallback((params: Record<string, unknown> = {}) => {
    return pageController.executeAction(actionId, params);
  }, [pageController, actionId]);
};