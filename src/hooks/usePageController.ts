// src/hooks/usePageController.ts

import { useEffect, useCallback, useRef, useState } from 'react';
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
  isRegistered: boolean;
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

  const [isRegistered, setIsRegistered] = useState(false);
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

  /**
   * Initialize page controller
   */
  useEffect(() => {
    const pageContext: PageContext = {
      pageId,
      pageName,
      state: pageState,
      props: pageProps,
      metadata: {
        category,
        tags,
        permissions
      }
    };

    const pageController: PageController = {
      pageId,
      pageName,
      description,
      actions: new Map(),
      context: pageContext,
      metadata: {
        category,
        tags,
        permissions,
        version: '1.0.0'
      },
      isActive: true,
      registeredAt: new Date()
    };

    try {
      registerPageController(pageController);
      setIsRegistered(true);
    } catch (error) {
      console.error(`Failed to register page controller for ${pageId}:`, error);
      setIsRegistered(false);
    }

    // Cleanup on unmount
    return () => {
      // Unregister all actions first
      registeredActionsRef.current.forEach(actionId => {
        try {
          contextUnregisterAction(pageId, actionId);
        } catch (error) {
          console.error(`Failed to unregister action ${actionId}:`, error);
        }
      });

      // Unregister page controller
      try {
        unregisterPageController(pageId);
        setIsRegistered(false);
      } catch (error) {
        console.error(`Failed to unregister page controller for ${pageId}:`, error);
      }
    };
  }, [
    pageId,
    pageName,
    description,
    category,
    pageProps,
    pageState,
    permissions,
    tags
  ]);

  /**
   * Update page context when state or props change
   */
  useEffect(() => {
    if (isRegistered) {
      const updatedContext: Partial<PageContext> = {
        state: pageState,
        props: pageProps
      };
      updatePageContext(pageId, updatedContext);
    }
  }, [pageState, pageProps, isRegistered, pageId, updatePageContext]);

  /**
   * Register an action
   */
  const registerAction = useCallback((action: ActionDefinition) => {
    if (!isRegistered) {
      console.warn(`Cannot register action ${action.id}: page controller not registered`);
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

  /**
   * Get current page controller
   */
  const pageController = registry.getPageController(pageId) || null;

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