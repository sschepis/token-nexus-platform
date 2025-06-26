import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { OrganizationTheme, ThemeUpdate, ThemeValidationResult, ThemeTemplate } from '../../theming/types/theme.types';
import { getThemeEngine } from '../../theming/engine/ThemeEngine';
import { ThemeValidator } from '../../theming/utils/themeValidation';
// import { themeTemplatesList } from '../../theming/templates'; // REMOVED: No longer loaded directly client-side
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
    transformParams: (organizationId: string) => ({ orgId: organizationId }),
    transformResponse: (result: any) => {
      // Assuming result.success and result.theme will be OrganizationTheme
      if (result.success && result.theme) {
        return result.theme as OrganizationTheme;
      } else {
        // Fallback to platform defaults if no custom theme or error from server
        try {
          const themeEngine = getThemeEngine();
          const platformDefaults = themeEngine.getPlatformDefaults(); // Will now come from BuiltInThemes.ts
          return platformDefaults;
        } catch (error) {
          console.warn('Theme engine failed for fallback, using minimal emergency theme:', error);
          // Minimal fallback to prevent crashes if theme engine fails completely
          return {
            id: 'emergency-fallback', name: 'Emergency Fallback', version: '1.0.0',
            description: 'Minimal theme due to serious client-side error',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            colors: { primary: '#000000', secondary: '#cccccc', accent: '#333333', background: '#f0f0f0', surface: '#ffffff', text: { primary: '#000000', secondary: '#555555', muted: '#999999' }, border: '#e0e0e0', input: '#e0e0e0', ring: '#000000', destructive: '#ff0000', warning: '#ffcc00', success: '#00ff00', info: '#0000ff', neutral: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' } },
            typography: { fontFamily: 'sans-serif', sizes: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem' }, weights: { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 }, lineHeights: { tight: '1.25', normal: '1.5', relaxed: '1.75', loose: '2' }, letterSpacing: { tight: '-0.02em', normal: '0', wide: '0.02em' } },
            spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem', '3xl': '4rem', '4xl': '5rem', '5xl': '6rem', '6xl': '7rem' },
            borderRadius: { none: '0px', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem', full: '9999px' },
            shadows: { sm: '0 1px 2px 0 rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)', inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)', none: 'none' },
            components: { button: {}, card: {}, input: {}, sidebar: {}, navbar: {}, modal: {}, dropdown: {}, table: {}, badge: {}, alert: {}, tooltip: {}, tabs: {} },
            branding: { logo: '', favicon: '', appIcon: '', brandName: '', tagline: '' },
            layout: { sidebarWidth: '16rem', headerHeight: '4rem', containerMaxWidth: '1280px', contentPadding: '1.5rem', gridGap: '1rem', cardPadding: '1rem', formSpacing: '1rem' },
            animations: { duration: { fast: '150ms', normal: '300ms', slow: '500ms' }, easing: { ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out', easeInOut: 'ease-in-out', bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' }, transitions: { all: 'all 0.3s ease', colors: 'background-color 0.3s ease, color 0.3s ease', opacity: 'opacity 0.3s ease', transform: 'transform 0.3s ease' } },
            customProperties: {}, darkMode: undefined
          } as unknown as OrganizationTheme;
        }
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

  // validateTheme is a client-side only utility, so it uses createAsyncThunk directly
  validateTheme: createAsyncThunk<ThemeValidationResult, { theme: OrganizationTheme }, { rejectValue: string }>( // Added rejectValue type
    'theme/validateTheme',
    async (params, { rejectWithValue }) => {
      try {
        const validationResult = ThemeValidator.validateTheme(params.theme);
        return validationResult;
      } catch (error: any) {
        return rejectWithValue(error.message || 'Client-side validation failed');
      }
    }
  ),

  loadThemeTemplates: AsyncThunkFactory.create<void, ThemeTemplate[]>({
    name: 'theme/loadThemeTemplates',
    cloudFunction: 'getThemeTemplates', // This will now fetch from server
    transformResponse: (result: any) => {
      if (result.success && Array.isArray(result.templates)) {
        return result.templates as ThemeTemplate[];
      } else {
        // Fallback to an empty array or handle error if no templates from server
        console.warn('Failed to load theme templates from server, returning empty array.');
        return [];
      }
    },
    errorMessage: 'Failed to load theme templates'
  }),

  applyThemeTemplate: AsyncThunkFactory.create<{ templateId: string; organizationId: string }, OrganizationTheme>({
    name: 'theme/applyThemeTemplate',
    cloudFunction: 'applyThemeTemplate', // This will now call a server-side function
    transformParams: (params) => ({
      templateId: params.templateId,
      organizationId: params.organizationId // Pass organizationId to the server
    }),
    transformResponse: (result: any) => {
      if (result.success && result.theme) {
        toast.success('Theme template applied successfully');
        return result.theme as OrganizationTheme;
      } else {
        throw new Error(result.error || 'Failed to apply theme template');
      }
    },
    errorMessage: 'Failed to apply theme template'
  }),

  // Additional thunks for controller actions (already point to cloud functions via factory)
  getAvailableThemes: AsyncThunkFactory.create<{ orgId: string; includeCustom?: boolean; category?: string }, any[]>({
    name: 'theme/getAvailableThemes',
    cloudFunction: 'getAvailableThemes',
    transformParams: (params) => ({
      orgId: params.orgId,
      includeCustom: params.includeCustom || true,
      category: params.category
    }),
    transformResponse: (result: any) => {
      if (result.success) {
        return result.themes || result;
      } else {
        throw new Error(result.error || 'Failed to get available themes');
      }
    },
    errorMessage: 'Failed to load available themes'
  }),

  createCustomTheme: AsyncThunkFactory.create<{ orgId: string; userId: string; themeData: any }, any>({
    name: 'theme/createCustomTheme',
    cloudFunction: 'createCustomTheme',
    transformParams: (params) => ({
      orgId: params.orgId,
      userId: params.userId,
      themeData: params.themeData
    }),
    transformResponse: (result: any) => {
      if (result.success) {
        toast.success('Custom theme created successfully');
        return result.theme;
      } else {
        throw new Error(result.error || 'Failed to create custom theme');
      }
    },
    errorMessage: 'Failed to create custom theme'
  }),

  updateThemeCustomization: AsyncThunkFactory.create<{ orgId: string; userId: string; customizations: any; merge?: boolean }, any>({
    name: 'theme/updateThemeCustomization',
    cloudFunction: 'updateThemeCustomization',
    transformParams: (params) => ({
      orgId: params.orgId,
      userId: params.userId,
      customizations: params.customizations,
      merge: params.merge !== false
    }),
    transformResponse: (result: any) => {
      if (result.success) {
        toast.success('Theme customization updated successfully');
        return result.theme;
      } else {
        throw new Error(result.error || 'Failed to update theme customization');
      }
    },
    errorMessage: 'Failed to update theme customization'
  }),

  deleteCustomTheme: AsyncThunkFactory.create<{ themeTemplateId: string }, { deleted: boolean; themeTemplateId: string }>({
    name: 'theme/deleteCustomTheme',
    cloudFunction: 'deleteCustomTheme',
    transformParams: (params) => ({
      themeTemplateId: params.themeTemplateId
    }),
    transformResponse: (result: any) => {
      if (result.success) {
        toast.success('Custom theme deleted successfully');
        return { deleted: true, themeTemplateId: result.themeTemplateId };
      } else {
        throw new Error(result.error || 'Failed to delete custom theme');
      }
    },
    errorMessage: 'Failed to delete custom theme'
  }),

  applyTheme: AsyncThunkFactory.create<{ orgId: string; userId: string; themeId?: string; themeName?: string; customizations?: any }, any>({
    name: 'theme/applyTheme',
    cloudFunction: 'applyTheme',
    transformParams: (params) => ({
      orgId: params.orgId,
      userId: params.userId,
      themeId: params.themeId,
      themeName: params.themeName,
      customizations: params.customizations || {}
    }),
    transformResponse: (result: any) => {
      if (result.success) {
        toast.success('Theme applied successfully');
        return result.theme;
      } else {
        throw new Error(result.error || 'Failed to apply theme');
      }
    },
    errorMessage: 'Failed to apply theme'
  })
};

const initialState: ThemeState = createAsyncInitialState({
  currentTheme: null,
  
  templates: [], // Initialize templates as empty, they will be loaded from server
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
     * Sets the current theme (used in fulfilled thunk cases)
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
     * Updates the current theme with partial changes (client-side only for editor)
     */
    updateCurrentTheme: (state, action: PayloadAction<ThemeUpdate>) => {
      if (state.currentTheme) {
        const themeEngine = getThemeEngine();
        const inheritance = themeEngine.resolveTheme(action.payload, state.currentTheme);
        state.currentTheme = inheritance.resolved;
        state.editorState.isDirty = true;
      }
    },

    /**
     * Sets preview theme (client-side only)
     */
    setPreviewTheme: (state, action: PayloadAction<OrganizationTheme | null>) => {
      state.previewTheme = action.payload;
      state.isPreviewMode = action.payload !== null;
    },

    /**
     * Clears preview mode (client-side only)
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
     * Resets theme state (clears all volatile state)
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
    // These extraReducers handle the state updates based on the lifecycle of the async thunks.
    // The AsyncReducerBuilder abstracts the common pending/fulfilled/rejected patterns.

    // Load organization theme
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

    // Validate theme (client-side only, thus using createAsyncThunk directly)
    // Manually add cases as it's not using AsyncThunkFactory.create standard boilerplate
    builder
      .addCase(themeThunks.validateTheme.pending, (state) => {
        state.isLoading = true; // Use general isLoading for client-side thunks
        state.error = null;
        state.validationResult = null;
      })
      .addCase(themeThunks.validateTheme.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.validationResult = action.payload;
      })
      .addCase(themeThunks.validateTheme.rejected, (state, action) => {
        state.isLoading = false;
        // action.payload contains the rejected value (error message string in this case)
        state.validationResult = {
          isValid: false,
          errors: [{ field: 'general', message: action.payload as string || 'Validation failed', severity: 'error', code: 'VALIDATION_ERROR' }],
          warnings: [],
          accessibilityScore: 0,
          performanceScore: 0
        };
        state.error = action.payload as string || 'Validation failed'; // Also update general error state
      });

    // Load theme templates
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.loadThemeTemplates, {
      loadingFlag: 'templatesLoading',
      onFulfilled: (state, action) => {
        state.templates = action.payload;
        state.templatesError = null;
      },
      onRejected: (state, action) => {
        state.templates = [];
        state.templatesError = action.payload as string || 'Failed to load templates';
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

    // Get available themes
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.getAvailableThemes, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.templates = action.payload; // Update templates with available themes
      },
      onRejected: (state, action) => {
        state.templatesError = action.payload as string || 'Failed to load available themes';
      }
    });

    // Create custom theme
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.createCustomTheme, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.templates = [...state.templates, action.payload]; // Using spread to ensure immutability
      }
    });

    // Update theme customization
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.updateThemeCustomization, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.currentTheme = action.payload;
        state.editorState.isDirty = false;
      }
    });

    // Delete custom theme
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.deleteCustomTheme, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.templates = state.templates.filter(t => t.id !== action.payload.themeTemplateId);
      }
    });

    // Apply theme (this is different from applyThemeTemplate)
    AsyncReducerBuilder.addAsyncCase(builder, themeThunks.applyTheme, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        state.currentTheme = action.payload;
        state.editorState.isDirty = false;
      }
    });
  }
});

// Export all thunks (Async Actions)
export const {
  loadOrganizationTheme,
  saveOrganizationTheme,
  resetOrganizationTheme,
  validateTheme, // Client-side thunk
  loadThemeTemplates,
  applyThemeTemplate,
  getAvailableThemes,
  createCustomTheme,
  updateThemeCustomization,
  deleteCustomTheme,
  applyTheme
} = themeThunks; 

// Export all standard reducers (Synchronous Actions)
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