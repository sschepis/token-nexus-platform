import { createCRUDSlice, createApiServiceAdapter } from '../utils/createCRUDSlice';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workflowsApi } from '../../services/api/workflows';
import { 
  Workflow, 
  WorkflowState, 
  CreateWorkflowRequest, 
  UpdateWorkflowRequest,
  WorkflowExecution,
  ExecuteWorkflowRequest,
  WorkflowStatus,
  CloneWorkflowRequest,
  WorkflowNodeType,
  WorkflowTemplate,
  WorkflowStatistics
} from '@/types/workflows';

/**
 * Refactored Workflow Slice using createCRUDSlice utility
 * This eliminates massive duplication of async thunks and reducer patterns
 */

// Create API service adapter for workflows
const workflowApiAdapter = createApiServiceAdapter<Workflow, CreateWorkflowRequest, UpdateWorkflowRequest>(workflowsApi, {
  getAllMethod: 'getWorkflows',
  getByIdMethod: 'getWorkflowDetails',
  createMethod: 'createWorkflow',
  updateMethod: 'updateWorkflow',
  deleteMethod: 'deleteWorkflow'
});

// Create the main workflow CRUD slice
const workflowCRUD = createCRUDSlice<Workflow, CreateWorkflowRequest, UpdateWorkflowRequest>({
  name: 'workflow',
  apiService: workflowApiAdapter,
  initialState: {
    selectedWorkflowId: null,
    executions: [] as WorkflowExecution[],
    templates: [] as WorkflowTemplate[],
    nodeTypes: [] as WorkflowNodeType[],
    statistics: null as WorkflowStatistics | null,
    isExecuting: false,
    isCloning: false,
    isValidating: false,
    validationResult: null,
  },
  responseMapping: {
    items: 'workflows',
    item: 'workflow',
  },
  errorMessages: {
    fetch: 'Failed to fetch workflows',
    create: 'Failed to create workflow',
    update: 'Failed to update workflow',
    delete: 'Failed to delete workflow',
    getById: 'Failed to fetch workflow details',
  },
});

// Additional async thunks for workflow-specific operations
export const executeWorkflow = createAsyncThunk(
  'workflow/executeWorkflow',
  async (request: ExecuteWorkflowRequest) => {
    const response = await workflowsApi.executeWorkflow(request);
    return response.data;
  }
);

export const cloneWorkflow = createAsyncThunk(
  'workflow/cloneWorkflow',
  async (request: CloneWorkflowRequest) => {
    const response = await workflowsApi.cloneWorkflow(request);
    return response.data;
  }
);

export const fetchWorkflowExecutions = createAsyncThunk(
  'workflow/fetchWorkflowExecutions',
  async (params?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    skip?: number;
  }) => {
    const response = await workflowsApi.getWorkflowExecutions(params);
    return response.data;
  }
);

export const fetchNodeTypes = createAsyncThunk(
  'workflow/fetchNodeTypes',
  async (params?: { category?: string }) => {
    const response = await workflowsApi.getNodeTypes(params);
    return response.data;
  }
);

// Note: Templates functionality would need to be added to workflowsApi
// For now, we'll create a placeholder that returns empty array
export const fetchWorkflowTemplates = createAsyncThunk(
  'workflow/fetchWorkflowTemplates',
  async (params?: { category?: string }) => {
    // TODO: Implement getWorkflowTemplates in workflowsApi
    console.warn('fetchWorkflowTemplates: Templates API not implemented yet');
    return { templates: [] };
  }
);

export const validateWorkflow = createAsyncThunk(
  'workflow/validateWorkflow',
  async (params: {
    workflowId?: string;
    nodes?: any[];
    edges?: any[];
  }) => {
    const response = await workflowsApi.validateWorkflow(params);
    return response.data;
  }
);

export const fetchWorkflowStatistics = createAsyncThunk(
  'workflow/fetchWorkflowStatistics',
  async (params?: {
    timeRange?: string;
    workflowId?: string;
  }) => {
    const response = await workflowsApi.getWorkflowStatistics(params);
    return response.data;
  }
);

// Create the enhanced workflow slice
export const workflowSlice = createSlice({
  name: 'workflowModule',
  initialState: {
    // Base CRUD state from the utility
    ...workflowCRUD.slice.getInitialState(),
  },
  reducers: {
    ...workflowCRUD.slice.caseReducers,
    setSelectedWorkflowId: (state, action) => {
      state.selectedWorkflowId = action.payload;
    },
    clearWorkflowData: (state) => {
      state.executions = [];
      state.templates = [];
      state.nodeTypes = [];
      state.statistics = null;
      state.validationResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Execute workflow
      .addCase(executeWorkflow.pending, (state) => {
        state.isExecuting = true;
        state.error = null;
      })
      .addCase(executeWorkflow.fulfilled, (state, action) => {
        state.isExecuting = false;
        // Add execution to the list
        state.executions.unshift(action.payload);
      })
      .addCase(executeWorkflow.rejected, (state, action) => {
        state.isExecuting = false;
        state.error = action.error.message || 'Failed to execute workflow';
      })

      // Clone workflow
      .addCase(cloneWorkflow.pending, (state) => {
        state.isCloning = true;
        state.error = null;
      })
      .addCase(cloneWorkflow.fulfilled, (state, action) => {
        state.isCloning = false;
        // Add cloned workflow to the list
        state.items.unshift(action.payload);
      })
      .addCase(cloneWorkflow.rejected, (state, action) => {
        state.isCloning = false;
        state.error = action.error.message || 'Failed to clone workflow';
      })

      // Fetch workflow executions
      .addCase(fetchWorkflowExecutions.fulfilled, (state, action) => {
        state.executions = action.payload.executions || action.payload;
      })
      .addCase(fetchWorkflowExecutions.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch workflow executions';
      })

      // Fetch node types
      .addCase(fetchNodeTypes.fulfilled, (state, action) => {
        state.nodeTypes = Array.isArray(action.payload) ? action.payload : (action.payload.nodeTypes || []);
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch node types';
      })

      // Fetch workflow templates
      .addCase(fetchWorkflowTemplates.fulfilled, (state, action) => {
        state.templates = Array.isArray(action.payload) ? action.payload : (action.payload.templates || []);
      })
      .addCase(fetchWorkflowTemplates.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch workflow templates';
      })

      // Validate workflow
      .addCase(validateWorkflow.pending, (state) => {
        state.isValidating = true;
        state.error = null;
      })
      .addCase(validateWorkflow.fulfilled, (state, action) => {
        state.isValidating = false;
        state.validationResult = action.payload;
      })
      .addCase(validateWorkflow.rejected, (state, action) => {
        state.isValidating = false;
        state.error = action.error.message || 'Failed to validate workflow';
      })

      // Fetch workflow statistics
      .addCase(fetchWorkflowStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
      })
      .addCase(fetchWorkflowStatistics.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch workflow statistics';
      });
  },
});

// Export actions with backward-compatible names
export const {
  // CRUD actions from the utility
  fetchItems: fetchWorkflows,
  createItem: createWorkflow,
  updateItem: updateWorkflow,
  deleteItem: deleteWorkflow,
  fetchItemById: fetchWorkflowDetails,
  clearError: clearWorkflowErrors,
  setFilters: setWorkflowFilters,
  resetFilters: resetWorkflowFilters,
  clearSelectedItem: clearSelectedWorkflow,
} = workflowCRUD.actions;

// Export additional actions
export const {
  setSelectedWorkflowId,
  clearWorkflowData,
} = workflowSlice.actions;

// Export selectors with backward-compatible names
export const workflowSelectors = {
  // CRUD selectors from the utility
  selectWorkflows: workflowCRUD.selectors.selectItems,
  selectSelectedWorkflow: workflowCRUD.selectors.selectSelectedItem,
  selectIsLoadingWorkflows: workflowCRUD.selectors.selectIsLoading,
  selectIsCreatingWorkflow: workflowCRUD.selectors.selectIsCreating,
  selectIsUpdatingWorkflow: workflowCRUD.selectors.selectIsUpdating,
  selectIsDeletingWorkflow: workflowCRUD.selectors.selectIsDeleting,
  selectWorkflowError: workflowCRUD.selectors.selectError,
  selectWorkflowTotalCount: workflowCRUD.selectors.selectTotalCount,
  selectWorkflowHasMore: workflowCRUD.selectors.selectHasMore,
  selectWorkflowFilters: workflowCRUD.selectors.selectFilters,

  // Custom selectors for workflow-specific data
  selectSelectedWorkflowId: (state: any) => state.workflowModule.selectedWorkflowId,
  selectWorkflowExecutions: (state: any) => state.workflowModule.executions,
  selectWorkflowTemplates: (state: any) => state.workflowModule.templates,
  selectWorkflowNodeTypes: (state: any) => state.workflowModule.nodeTypes,
  selectWorkflowStatistics: (state: any) => state.workflowModule.statistics,
  selectIsExecutingWorkflow: (state: any) => state.workflowModule.isExecuting,
  selectIsCloningWorkflow: (state: any) => state.workflowModule.isCloning,
  selectIsValidatingWorkflow: (state: any) => state.workflowModule.isValidating,
  selectWorkflowValidationResult: (state: any) => state.workflowModule.validationResult,
};

export default workflowSlice.reducer;