/**
 * useReportState Hook
 * Manages report builder state and component interactions
 */

import { useState, useCallback, useEffect } from 'react';

export const useReportState = (initialState = {}) => {
  // State for components and layout
  const [components, setComponents] = useState(initialState.components || []);
  const [layout, setLayout] = useState(initialState.layout || {});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Add component to report
  const addComponent = useCallback(
    component => {
      setComponents(prev => {
        const newComponents = [...prev, component];
        // Add to history
        addToHistory({
          components: newComponents,
          layout: {
            ...layout,
            [component.id]: component.position,
          },
        });
        return newComponents;
      });

      setLayout(prev => ({
        ...prev,
        [component.id]: component.position,
      }));
    },
    [layout]
  );

  // Update component configuration
  const updateComponent = useCallback(
    (componentId, changes) => {
      setComponents(prev => {
        const newComponents = prev.map(component =>
          component.id === componentId ? { ...component, ...changes } : component
        );
        // Add to history
        addToHistory({
          components: newComponents,
          layout,
        });
        return newComponents;
      });
    },
    [layout]
  );

  // Remove component from report
  const removeComponent = useCallback(
    componentId => {
      setComponents(prev => {
        const newComponents = prev.filter(c => c.id !== componentId);
        // Add to history
        addToHistory({
          components: newComponents,
          layout: Object.entries(layout).reduce((acc, [key, value]) => {
            if (key !== componentId) {
              acc[key] = value;
            }
            return acc;
          }, {}),
        });
        return newComponents;
      });

      setLayout(prev => {
        const newLayout = { ...prev };
        delete newLayout[componentId];
        return newLayout;
      });
    },
    [layout]
  );

  // Update layout
  const updateLayout = useCallback(
    newLayout => {
      setLayout(newLayout);
      // Add to history
      addToHistory({
        components,
        layout: newLayout,
      });
    },
    [components]
  );

  // Add state to history
  const addToHistory = useCallback(
    state => {
      setHistory(prev => {
        // Remove any future states if we're not at the end
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, state];
      });
      setHistoryIndex(prev => prev + 1);
    },
    [historyIndex]
  );

  // Undo changes
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setComponents(previousState.components);
      setLayout(previousState.layout);
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  // Redo changes
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setComponents(nextState.components);
      setLayout(nextState.layout);
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Save current state
  const saveState = useCallback(() => {
    return {
      components,
      layout,
    };
  }, [components, layout]);

  // Load saved state
  const loadState = useCallback(state => {
    if (state?.components) {
      setComponents(state.components);
    }
    if (state?.layout) {
      setLayout(state.layout);
    }
    // Reset history
    setHistory([{ components: state.components, layout: state.layout }]);
    setHistoryIndex(0);
  }, []);

  // Get component by ID
  const getComponent = useCallback(
    componentId => {
      return components.find(c => c.id === componentId);
    },
    [components]
  );

  // Get components by type
  const getComponentsByType = useCallback(
    type => {
      return components.filter(c => c.type === type);
    },
    [components]
  );

  // Update component position
  const updateComponentPosition = useCallback(
    (componentId, position) => {
      setLayout(prev => {
        const newLayout = {
          ...prev,
          [componentId]: position,
        };
        // Add to history
        addToHistory({
          components,
          layout: newLayout,
        });
        return newLayout;
      });
    },
    [components]
  );

  // Check if can undo/redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Initialize history with initial state
  useEffect(() => {
    if (initialState && history.length === 0) {
      setHistory([
        {
          components: initialState.components || [],
          layout: initialState.layout || {},
        },
      ]);
      setHistoryIndex(0);
    }
  }, [initialState]);

  return {
    // State
    components,
    layout,

    // Actions
    addComponent,
    updateComponent,
    removeComponent,
    updateLayout,
    updateComponentPosition,

    // History
    undo,
    redo,
    canUndo,
    canRedo,

    // State management
    saveState,
    loadState,

    // Utilities
    getComponent,
    getComponentsByType,
  };
};
