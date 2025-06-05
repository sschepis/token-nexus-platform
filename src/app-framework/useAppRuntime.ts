/**
 * React Hook for App Runtime Framework Integration
 * Part of Phase 3: App Runtime Framework
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppRuntimeManager,
  AppRuntimeConfig,
  AppInstance,
  AppManifest,
  AppLoadOptions,
  ResourceUsage
} from './index';

export interface UseAppRuntimeOptions {
  config: AppRuntimeConfig;
  autoInitialize?: boolean;
}

export interface AppRuntimeState {
  isInitialized: boolean;
  loadedApps: AppInstance[];
  totalApps: number;
  runningApps: number;
  pausedApps: number;
  errorApps: number;
  totalResourceUsage: ResourceUsage;
  error: string | null;
}

export interface UseAppRuntimeReturn {
  // State
  state: AppRuntimeState;
  
  // Actions
  loadApp: (appId: string, manifest: AppManifest, options?: AppLoadOptions) => Promise<AppInstance>;
  unloadApp: (appId: string) => Promise<void>;
  startApp: (appId: string) => Promise<void>;
  stopApp: (appId: string) => Promise<void>;
  pauseApp: (appId: string) => Promise<void>;
  resumeApp: (appId: string) => Promise<void>;
  sendMessage: (appId: string, message: any) => Promise<any>;
  sendUIEvent: (appId: string, event: any) => Promise<void>;
  
  // Getters
  getAppInstance: (appId: string) => AppInstance | null;
  getAppStatus: (appId: string) => { state: string; resourceUsage: ResourceUsage; lastActivity: Date } | null;
  
  // Runtime Manager
  runtimeManager: AppRuntimeManager | null;
}

export function useAppRuntime(options: UseAppRuntimeOptions): UseAppRuntimeReturn {
  const { config, autoInitialize = true } = options;
  const runtimeManagerRef = useRef<AppRuntimeManager | null>(null);
  
  const [state, setState] = useState<AppRuntimeState>({
    isInitialized: false,
    loadedApps: [],
    totalApps: 0,
    runningApps: 0,
    pausedApps: 0,
    errorApps: 0,
    totalResourceUsage: {
      memory: 0,
      cpu: 0,
      storage: 0,
      networkRequests: 0,
      apiCalls: 0,
      timestamp: new Date()
    },
    error: null
  });

  // Initialize runtime manager
  useEffect(() => {
    if (autoInitialize && !runtimeManagerRef.current) {
      try {
        runtimeManagerRef.current = new AppRuntimeManager(config);
        
        // Set up event listeners
        const manager = runtimeManagerRef.current;
        
        manager.on('ui-update', (data: any) => {
          // Handle UI updates from apps
          console.log('App UI Update:', data);
        });
        
        manager.on('app-log', (data: any) => {
          // Handle app logs
          console.log(`App ${data.appId} [${data.level}]:`, data.message, data.data);
        });
        
        manager.on('app-error', (data: any) => {
          // Handle app errors
          console.error(`App ${data.appId} Error:`, data);
          updateState();
        });
        
        manager.on('worker-error', (data: any) => {
          // Handle worker errors
          console.error(`Worker Error for app ${data.appId}:`, data.error);
          updateState();
        });

        setState(prev => ({
          ...prev,
          isInitialized: true,
          error: null
        }));

      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to initialize runtime'
        }));
      }
    }

    return () => {
      // Cleanup on unmount
      if (runtimeManagerRef.current) {
        runtimeManagerRef.current.shutdown().catch(console.error);
        runtimeManagerRef.current = null;
      }
    };
  }, [config, autoInitialize]);

  // Update state from runtime manager
  const updateState = useCallback(() => {
    if (!runtimeManagerRef.current) return;

    const manager = runtimeManagerRef.current;
    const loadedApps = manager.getLoadedApps();
    const stats = manager.getRuntimeStats();

    setState(prev => ({
      ...prev,
      loadedApps,
      totalApps: stats.totalApps,
      runningApps: stats.runningApps,
      pausedApps: stats.pausedApps,
      errorApps: stats.errorApps,
      totalResourceUsage: stats.totalResourceUsage
    }));
  }, []);

  // Set up periodic state updates
  useEffect(() => {
    if (!runtimeManagerRef.current) return;

    const interval = setInterval(updateState, 5000); // Update every 5 seconds
    updateState(); // Initial update

    return () => clearInterval(interval);
  }, [updateState]);

  // App management functions
  const loadApp = useCallback(async (appId: string, manifest: AppManifest, options?: AppLoadOptions): Promise<AppInstance> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      const instance = await runtimeManagerRef.current.loadApp(appId, manifest, options);
      updateState();
      return instance;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load app'
      }));
      throw error;
    }
  }, [updateState]);

  const unloadApp = useCallback(async (appId: string): Promise<void> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      await runtimeManagerRef.current.unloadApp(appId);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to unload app'
      }));
      throw error;
    }
  }, [updateState]);

  const startApp = useCallback(async (appId: string): Promise<void> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      await runtimeManagerRef.current.startApp(appId);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start app'
      }));
      throw error;
    }
  }, [updateState]);

  const stopApp = useCallback(async (appId: string): Promise<void> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      await runtimeManagerRef.current.stopApp(appId);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop app'
      }));
      throw error;
    }
  }, [updateState]);

  const pauseApp = useCallback(async (appId: string): Promise<void> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      await runtimeManagerRef.current.pauseApp(appId);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to pause app'
      }));
      throw error;
    }
  }, [updateState]);

  const resumeApp = useCallback(async (appId: string): Promise<void> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      await runtimeManagerRef.current.resumeApp(appId);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resume app'
      }));
      throw error;
    }
  }, [updateState]);

  const sendMessage = useCallback(async (appId: string, message: any): Promise<any> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      return await runtimeManagerRef.current.sendMessage(appId, message);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }));
      throw error;
    }
  }, []);

  const sendUIEvent = useCallback(async (appId: string, event: any): Promise<void> => {
    if (!runtimeManagerRef.current) {
      throw new Error('Runtime manager not initialized');
    }

    try {
      await runtimeManagerRef.current.sendUIEvent(appId, event);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send UI event'
      }));
      throw error;
    }
  }, []);

  const getAppInstance = useCallback((appId: string): AppInstance | null => {
    if (!runtimeManagerRef.current) {
      return null;
    }
    return runtimeManagerRef.current.getAppInstance(appId);
  }, []);

  const getAppStatus = useCallback((appId: string) => {
    if (!runtimeManagerRef.current) {
      return null;
    }
    return runtimeManagerRef.current.getAppStatus(appId);
  }, []);

  return {
    state,
    loadApp,
    unloadApp,
    startApp,
    stopApp,
    pauseApp,
    resumeApp,
    sendMessage,
    sendUIEvent,
    getAppInstance,
    getAppStatus,
    runtimeManager: runtimeManagerRef.current
  };
}

// Helper hook for managing a single app
export function useApp(appId: string, manifest: AppManifest, runtimeManager: AppRuntimeManager | null) {
  const [appState, setAppState] = useState<{
    instance: AppInstance | null;
    isLoaded: boolean;
    isRunning: boolean;
    error: string | null;
  }>({
    instance: null,
    isLoaded: false,
    isRunning: false,
    error: null
  });

  // Load app on mount
  useEffect(() => {
    if (!runtimeManager) return;

    const loadApp = async () => {
      try {
        const instance = await runtimeManager.loadApp(appId, manifest);
        setAppState({
          instance,
          isLoaded: true,
          isRunning: instance.state === 'running',
          error: null
        });
      } catch (error) {
        setAppState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load app'
        }));
      }
    };

    loadApp();

    return () => {
      // Unload app on unmount
      runtimeManager.unloadApp(appId).catch(console.error);
    };
  }, [appId, manifest, runtimeManager]);

  // Update app state periodically
  useEffect(() => {
    if (!runtimeManager || !appState.isLoaded) return;

    const interval = setInterval(() => {
      const instance = runtimeManager.getAppInstance(appId);
      if (instance) {
        setAppState(prev => ({
          ...prev,
          instance,
          isRunning: instance.state === 'running'
        }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [appId, runtimeManager, appState.isLoaded]);

  const start = useCallback(async () => {
    if (!runtimeManager) throw new Error('Runtime manager not available');
    await runtimeManager.startApp(appId);
  }, [appId, runtimeManager]);

  const stop = useCallback(async () => {
    if (!runtimeManager) throw new Error('Runtime manager not available');
    await runtimeManager.stopApp(appId);
  }, [appId, runtimeManager]);

  const pause = useCallback(async () => {
    if (!runtimeManager) throw new Error('Runtime manager not available');
    await runtimeManager.pauseApp(appId);
  }, [appId, runtimeManager]);

  const resume = useCallback(async () => {
    if (!runtimeManager) throw new Error('Runtime manager not available');
    await runtimeManager.resumeApp(appId);
  }, [appId, runtimeManager]);

  const sendMessage = useCallback(async (message: any) => {
    if (!runtimeManager) throw new Error('Runtime manager not available');
    return await runtimeManager.sendMessage(appId, message);
  }, [appId, runtimeManager]);

  return {
    ...appState,
    start,
    stop,
    pause,
    resume,
    sendMessage
  };
}