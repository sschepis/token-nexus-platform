import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OrganizationTheme, ThemeUpdate, ThemeValidationResult, ThemeTemplate } from '../../theming/types/theme.types';
import { getThemeEngine } from '../../theming/engine/ThemeEngine';
import { ThemeValidator } from '../../theming/utils/themeValidation';
import { themeTemplatesList } from '../../theming/templates';
import { toast } from 'sonner';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored theme slice using AsyncThunkFactory utilities
 * This eliminates all the repetitive Parse.Cloud.run and error handling patterns
 */

export interface ThemeState extends ExtendedAsyncState {
  // Current theme state
  currentTheme: OrganizationTheme | null;
  
  // Theme templates
  templates: ThemeTemplate[];
  templatesLoading: boolean;
  templatesError: string | null;
  
  // Theme validation
  validationResult: ThemeValidationResult | null;
  
  // Theme preview
  previewTheme: OrganizationTheme | null;
  isPreviewMode: boolean;
  
  // Theme history for undo/redo
  themeHistory: OrganizationTheme[];
  historyIndex: number;
  maxHistorySize: number;
  
  // Theme editor state
  editorState: {
    activeTab: 'colors' | 'typography' | 'components' | 'branding' | 'layout';
    selectedComponent: string | null;
    isDirty: boolean;
    autoSave: boolean;
  };
}

// Create async thunks using the factory
const themeThunks = {
  loadOrganizationTheme: AsyncThunkFactory.create<string, OrganizationTheme>({
    name: 'theme/loadOrganizationTheme',
    cloudFunction: 'getOrganizationTheme',
    transformParams: (organizationId: string) => ({}), // organizationId handled by middleware
    transformResponse: (result: any) => {
      if (result.success && result.theme) {
        return result.theme as OrganizationTheme;
      } else {
        // Return platform defaults if no custom theme
        const themeEngine = getThemeEngine();
        const platformDefaults = themeEngine.getPlatformDefaults();
        return platformDefaults;
      }
    },
    errorMessage: 'Failed to load organization theme'
  }),

  saveOrganizationTheme: AsyncThunkFactory.create<OrganizationTheme, OrganizationTheme>({
    name: 'theme/saveOrganizationTheme',
    cloudFunction: 'saveOrganizationTheme',
    transformParams: (theme: OrganizationTheme) => ({
      theme: {
        ...theme,
        updatedAt: new Date().toISOString()
      }
    }),
    transformResponse: (result: any) => {
      if (result.success) {
        toast.success('Theme saved successfully');
        return result.theme as OrganizationTheme;
      } else {
        throw new Error(result.error || 'Failed to save theme');
      }
    },
    errorMessage: 'Failed to save theme'
  }),

  resetOrganizationTheme: AsyncThunkFactory.create<void, OrganizationTheme>({
    name: 'theme/resetOrganizationTheme',
    cloudFunction: 'resetOrganizationTheme',
    transformResponse: (result: any) => {
      toast.success('Theme reset to default');
      return result.theme as OrganizationTheme;
    },
    errorMessage: 'Failed to reset theme'
  }),

  validateTheme: AsyncThunkFactory.create<{ theme: OrganizationTheme }, ThemeValidationResult>({
    name: 'theme/validateTheme',
    cloudFunction: 'validateTheme',
    transformParams: (params) => ({ theme: params.theme }),
    transformResponse: (result: any) => {
      // For client-side validation, we can use ThemeValidator directly
      return ThemeValidator.validateTheme(result.theme || result);
    },
    errorMessage: 'Failed to validate theme'
  }),

  loadThemeTemplates: AsyncThunkFactory.create<void, ThemeTemplate[]>({
    name: 'theme/loadThemeTemplates',
    cloudFunction: 'getThemeTemplates',
    transformResponse: (result: any) => {
      // For now, return built-in templates, but could be server-loaded in future
      return themeTemplatesList;
    },
    errorMessage: 'Failed to load theme templates'
  }),

  applyThemeTemplate: AsyncThunkFactory.create<{ templateId: string; organizationId: string }, OrganizationTheme>({
    name: 'theme/applyThemeTemplate',
    cloudFunction: 'applyThemeTemplate',
    transformParams: (params) => ({
      templateId: params.templateId,
      _originalParams: params // Store original params for response transformation
    }),
    transformResponse: (result: any) => {
      // Extract original params from result or use result directly
      const originalParams = result._originalParams || result;
      const templateId = result.templateId || originalParams.templateId;
      const organizationId = result.organizationId || originalParams.organizationId;
      
      // Client-side template application
      const template = themeTemplatesList.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Theme template not found');
      }

      const themeEngine = getThemeEngine();
      const inheritance = themeEngine.resolveTheme({}, template.theme as OrganizationTheme);
      const resolvedTheme = inheritance.resolved;
      
      // Set organization-specific properties
      resolvedTheme.organizationId = organizationId;
      resolvedTheme.id = `${organizationId}-${templateId}-${Date.now()}`;
      resolvedTheme.name = `${template.name} - ${organizationId}`;
      resolvedTheme.templateId = templateId;

      toast.success('Theme template applied successfully');
      return resolvedTheme;
    },
    errorMessage: 'Failed to apply theme template'
  })
};

// Export thunks for backward compatibility
export const {
  loadOrganizationTheme,
  saveOrganizationTheme,
  resetOrganizationTheme,
  validateTheme,
  loadThemeTemplates,
  applyThemeTemplate
} = themeThunks;

const initialState: ThemeState = createAsyncInitialState({
  currentTheme: null,
  
  templates: themeTemplatesList,
  templatesLoading: false,
  templatesError: null,
  
  validationResult: null,
  
  previewTheme: null,
  isPreviewMode: false,
  
  themeHistory: [],
  historyIndex: -1,
  maxHistorySize: 20,
  
  editorState: {
    activeTab: 'colors',
    selectedComponent: null,
    isDirty: false,
    autoSave: true
  }
}, { includeExtended: true });

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Sets the current theme
     */
    setCurrentTheme: (state, action: PayloadAction<OrganizationTheme>) => {
      state.currentTheme = action.payload;
      state.error = null;
      
      // Add to history if it's different from current
      if (state.historyIndex === -1 || 
          state.themeHistory[state.historyIndex]?.id !== action.payload.id) {
        // Remove any history after current index
        state.themeHistory = state.themeHistory.slice(0, state.historyIndex + 1);
        
        // Add new theme to history
        state.themeHistory.push(action.payload);
        state.historyIndex = state.themeHistory.length - 1;
        
        // Limit history size
        if (state.themeHistory.length > state.maxHistorySize) {
          state.themeHistory = state.themeHistory.slice(-state.maxHistorySize);
          state.historyIndex = state.themeHistory.length - 1;
        }
      }
    },

    /**
     * Updates the current theme with partial changes
     */
    updateCurrentTheme: (state, action: PayloadAction<ThemeUpdate>) => {
      if (state.currentTheme) {
        // Deep merge the updates
        const themeEngine = getThemeEngine();
        const inheritance = themeEngine.resolveTheme(action.payload, state.currentTheme);
        state.currentTheme = inheritance.resolved;
        state.editorState.isDirty = true;
      }
    },

    /**
     * Sets preview theme
     */
    setPreviewTheme: (state, action: PayloadAction<OrganizationTheme | null>) => {
      state.previewTheme = action.payload;
      state.isPreviewMode = action.payload !== null;
    },

    /**
     * Clears preview mode
     */
    clearPreview: (state) => {
      state.previewTheme = null;
      state.isPreviewMode = false;
    },

    /**
     * Undo theme change
     */
    undoTheme: (state) => {
      if (state.historyIndex > 0) {
        state.historyIndex -= 1;
        state.currentTheme = state.themeHistory[state.historyIndex];
        state.editorState.isDirty = true;
      }
    },

    /**
     * Redo theme change
     */
    redoTheme: (state) => {
      if (state.historyIndex < state.themeHistory.length - 1) {
        state.historyIndex += 1;
        state.currentTheme = state.themeHistory[state.historyIndex];
        state.editorState.isDirty = true;
      }
    },

    /**
     * Sets editor active tab
     */
    setEditorActiveTab: (state, action: PayloadAction<ThemeState['editorState']['activeTab']>) => {
      state.editorState.activeTab = action.payload;
    },

    /**
     * Sets selected component for editing
     */
    setSelectedComponent: (state, action: PayloadAction<string | null>) => {
      state.editorState.selectedComponent = action.payload;
    },

    /**
     * Sets editor dirty state
     */
    setEditorDirty: (state, action: PayloadAction<boolean>) => {
      state.editorState.isDirty = action.payload;
    },

    /**
     * Toggles auto-save
     */
    toggleAutoSave: (state) => {
      state.editorState.autoSave = !state.editorState.autoSave;
    },

    /**
     * Resets theme state
     */
    resetThemeState: (state) => {
      state.currentTheme = null;
      state.error = null;
      state.validationResult = null;
      state.previewTheme = null;
      state.isPreviewMode = false;
      state.themeHistory = [];
      state.historyIndex = -1;
      state.editorState = {
        activeTab: 'colors',
        selectedComponent: null,
        isDirty: false,
        autoSave: true
      };
    },

    /**
     * Sets validation result
     */
    setValidationResult: (state, action: PayloadAction<ThemeValidationResult | null>) => {
      state.validationResult = action.payload;
    },

    /**
     * Clears theme error
     */
    clearThemeError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Load organization theme using AsyncReducerBuilder
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.loadOrganizationTheme, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.currentTheme = action.payload;
        // Initialize history with loaded theme
        state.themeHistory = [action.payload];
        state.historyIndex = 0;
      }
    });

    // Save organization theme
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.saveOrganizationTheme, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.currentTheme = action.payload;
        state.editorState.isDirty = false;
      }
    });

    // Reset organization theme
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.resetOrganizationTheme, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.currentTheme = action.payload;
        state.editorState.isDirty = false;
      }
    });

    // Apply theme template
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.applyThemeTemplate, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.currentTheme = action.payload;
        state.editorState.isDirty = true;
        
        // Add to history
        state.themeHistory = state.themeHistory.slice(0, state.historyIndex + 1);
        state.themeHistory.push(action.payload);
        state.historyIndex = state.themeHistory.length - 1;
      }
    });

    // Validate theme
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.validateTheme, {
      onFulfilled: (state, action) => {
        state.validationResult = action.payload;
      }
    });

    // Load theme templates
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.loadThemeTemplates, {
      loadingFlag: 'templatesLoading',
      onFulfilled: (state, action) => {
        state.templates = action.payload;
        state.templatesError = null;
      },
      onRejected: (state, action) => {
        state.templatesError = action.payload || 'Failed to load theme templates';
      }
    });
  }
});

export const {
  setCurrentTheme,
  updateCurrentTheme,
  setPreviewTheme,
  clearPreview,
  undoTheme,
  redoTheme,
  setEditorActiveTab,
  setSelectedComponent,
  setEditorDirty,
  toggleAutoSave,
  resetThemeState,
  setValidationResult,
  clearThemeError
} = themeSlice.actions;

export default themeSlice.reducer;

// Selectors
export const selectCurrentTheme = (state: { theme: ThemeState }) => state.theme.currentTheme;
export const selectThemeLoading = (state: { theme: ThemeState }) => state.theme.isLoading;
export const selectThemeError = (state: { theme: ThemeState }) => state.theme.error;
export const selectThemeTemplates = (state: { theme: ThemeState }) => state.theme.templates;
export const selectPreviewTheme = (state: { theme: ThemeState }) => state.theme.previewTheme;
export const selectIsPreviewMode = (state: { theme: ThemeState }) => state.theme.isPreviewMode;
export const selectValidationResult = (state: { theme: ThemeState }) => state.theme.validationResult;
export const selectEditorState = (state: { theme: ThemeState }) => state.theme.editorState;
export const selectCanUndo = (state: { theme: ThemeState }) => state.theme.historyIndex > 0;
export const selectCanRedo = (state: { theme: ThemeState }) => 
  state.theme.historyIndex < state.theme.themeHistory.length - 1;