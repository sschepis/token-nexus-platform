import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { OrganizationTheme, ThemeUpdate, ThemeValidationResult, ThemeTemplate } from '../../theming/types/theme.types';
import { getThemeEngine } from '../../theming/engine/ThemeEngine';
import { ThemeValidator } from '../../theming/utils/themeValidation';
import { themeTemplatesList } from '../../theming/templates';
import Parse from 'parse';
import { toast } from 'sonner';

/**
 * Enhanced theme slice for comprehensive organization theme management
 */

export interface ThemeState {
  // Current theme state
  currentTheme: OrganizationTheme | null;
  isLoading: boolean;
  error: string | null;
  
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

const initialState: ThemeState = {
  currentTheme: null,
  isLoading: false,
  error: null,
  
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
};

/**
 * Async thunk to load organization theme
 */
export const loadOrganizationTheme = createAsyncThunk(
  'theme/loadOrganizationTheme',
  async (organizationId: string, { rejectWithValue }) => {
    try {
      const result = await Parse.Cloud.run('getOrganizationTheme', {
        // organizationId removed - now handled by middleware
      });
      
      if (result.success && result.theme) {
        return result.theme as OrganizationTheme;
      } else {
        // Return platform defaults if no custom theme
        const themeEngine = getThemeEngine();
        const platformDefaults = themeEngine.getPlatformDefaults();
        platformDefaults.organizationId = organizationId;
        return platformDefaults;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load organization theme';
      return rejectWithValue(message);
    }
  }
);

/**
 * Async thunk to save organization theme
 */
export const saveOrganizationTheme = createAsyncThunk(
  'theme/saveOrganizationTheme',
  async (theme: OrganizationTheme, { rejectWithValue }) => {
    try {
      // Validate theme before saving
      const validation = ThemeValidator.validateTheme(theme);
      if (!validation.isValid && validation.errors.some(e => e.severity === 'error')) {
        return rejectWithValue(`Theme validation failed: ${validation.errors[0].message}`);
      }

      const result = await Parse.Cloud.run('saveOrganizationTheme', {
        // organizationId removed - now handled by middleware
        theme: {
          ...theme,
          updatedAt: new Date().toISOString()
        }
      });

      if (result.success) {
        toast.success('Theme saved successfully');
        return result.theme as OrganizationTheme;
      } else {
        return rejectWithValue(result.error || 'Failed to save theme');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save organization theme';
      return rejectWithValue(message);
    }
  }
);

/**
 * Async thunk to apply theme template
 */
export const applyThemeTemplate = createAsyncThunk(
  'theme/applyThemeTemplate',
  async ({ templateId, organizationId }: { templateId: string; organizationId: string }, { rejectWithValue }) => {
    try {
      const template = themeTemplatesList.find(t => t.id === templateId);
      if (!template) {
        return rejectWithValue('Theme template not found');
      }

      const themeEngine = getThemeEngine();
      const inheritance = themeEngine.resolveTheme({}, template.theme as OrganizationTheme);
      const resolvedTheme = inheritance.resolved;
      
      // Set organization-specific properties
      resolvedTheme.organizationId = organizationId;
      resolvedTheme.id = `${organizationId}-${templateId}-${Date.now()}`;
      resolvedTheme.name = `${template.name} - ${organizationId}`;
      resolvedTheme.templateId = templateId;

      return resolvedTheme;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply theme template';
      return rejectWithValue(message);
    }
  }
);

/**
 * Async thunk to validate theme
 */
export const validateTheme = createAsyncThunk(
  'theme/validateTheme',
  async (theme: OrganizationTheme) => {
    return ThemeValidator.validateTheme(theme);
  }
);

/**
 * Async thunk to load theme templates
 */
export const loadThemeTemplates = createAsyncThunk(
  'theme/loadThemeTemplates',
  async (_, { rejectWithValue }) => {
    try {
      // In the future, this could load templates from a server
      // For now, return the built-in templates
      return themeTemplatesList;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load theme templates';
      return rejectWithValue(message);
    }
  }
);

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
    builder
      // Load organization theme
      .addCase(loadOrganizationTheme.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadOrganizationTheme.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTheme = action.payload;
        
        // Initialize history with loaded theme
        state.themeHistory = [action.payload];
        state.historyIndex = 0;
      })
      .addCase(loadOrganizationTheme.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        toast.error('Failed to load organization theme');
      })

      // Save organization theme
      .addCase(saveOrganizationTheme.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveOrganizationTheme.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTheme = action.payload;
        state.editorState.isDirty = false;
      })
      .addCase(saveOrganizationTheme.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        toast.error('Failed to save theme');
      })

      // Apply theme template
      .addCase(applyThemeTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(applyThemeTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTheme = action.payload;
        state.editorState.isDirty = true;
        
        // Add to history
        state.themeHistory = state.themeHistory.slice(0, state.historyIndex + 1);
        state.themeHistory.push(action.payload);
        state.historyIndex = state.themeHistory.length - 1;
      })
      .addCase(applyThemeTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        toast.error('Failed to apply theme template');
      })

      // Validate theme
      .addCase(validateTheme.fulfilled, (state, action) => {
        state.validationResult = action.payload;
      })

      // Load theme templates
      .addCase(loadThemeTemplates.pending, (state) => {
        state.templatesLoading = true;
        state.templatesError = null;
      })
      .addCase(loadThemeTemplates.fulfilled, (state, action) => {
        state.templatesLoading = false;
        state.templates = action.payload;
      })
      .addCase(loadThemeTemplates.rejected, (state, action) => {
        state.templatesLoading = false;
        state.templatesError = action.payload as string;
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