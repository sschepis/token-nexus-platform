import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
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

const initialState: WorkflowState = {
  workflows: [],
  selectedWorkflowId: null,
  isLoading: false,
  error: null,
  executions: [],
  templates: [],
  nodeTypes: []
};

// Async thunks following existing patterns from triggerSlice and integrationSlice
export const fetchWorkflows = createAsyncThunk(
  'workflow/fetchWorkflows',
  async (params: { status?: string; tags?: string[]; limit?: number; skip?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.tags) queryParams.append('tags', params.tags.join(','));
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.skip) queryParams.append('skip', params.skip.toString());

      const response = await fetch(`/api/workflows?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch workflows');
    }
  }
);

export const createWorkflow = createAsyncThunk(
  'workflow/createWorkflow',
  async (workflowData: CreateWorkflowRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create workflow');
    }
  }
);

export const updateWorkflow = createAsyncThunk(
  'workflow/updateWorkflow',
  async (updateData: UpdateWorkflowRequest, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/workflows/${updateData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update workflow');
    }
  }
);

export const executeWorkflow = createAsyncThunk(
  'workflow/executeWorkflow',
  async (request: ExecuteWorkflowRequest, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/workflows/${request.workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to execute workflow');
    }
  }
);

export const deleteWorkflow = createAsyncThunk(
  'workflow/deleteWorkflow',
  async (workflowId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return { workflowId };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete workflow');
    }
  }
);

export const cloneWorkflow = createAsyncThunk(
  'workflow/cloneWorkflow',
  async (request: CloneWorkflowRequest, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/workflows/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to clone workflow');
    }
  }
);

export const fetchWorkflowExecutions = createAsyncThunk(
  'workflow/fetchWorkflowExecutions',
  async (params: { workflowId?: string; status?: string; limit?: number; skip?: number } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.workflowId) queryParams.append('workflowId', params.workflowId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.skip) queryParams.append('skip', params.skip.toString());

      const response = await fetch(`/api/workflows/executions?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch workflow executions');
    }
  }
);

export const fetchNodeTypes = createAsyncThunk(
  'workflow/fetchNodeTypes',
  async (params: { category?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);

      const response = await fetch(`/api/workflows/node-types?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch node types');
    }
  }
);

export const fetchWorkflowTemplates = createAsyncThunk(
  'workflow/fetchWorkflowTemplates',
  async (params: { category?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params?.category) queryParams.append('category', params.category);

      const response = await fetch(`/api/workflows/templates?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch workflow templates');
    }
  }
);

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setSelectedWorkflow: (state, action: PayloadAction<string | null>) => {
      state.selectedWorkflowId = action.payload;
    },
    
    updateWorkflowNodes: (state, action: PayloadAction<{ workflowId: string; nodes: any[]; edges: any[] }>) => {
      const { workflowId, nodes, edges } = action.payload;
      const workflowIndex = state.workflows.findIndex(w => w.id === workflowId);
      
      if (workflowIndex >= 0) {
        state.workflows[workflowIndex].nodes = nodes;
        state.workflows[workflowIndex].edges = edges;
        state.workflows[workflowIndex].updatedAt = new Date().toISOString();
        state.workflows[workflowIndex].version += 1;
      }
    },
    
    setWorkflowStatus: (state, action: PayloadAction<{ id: string; status: WorkflowStatus }>) => {
      const { id, status } = action.payload;
      const workflowIndex = state.workflows.findIndex(w => w.id === id);
      
      if (workflowIndex >= 0) {
        state.workflows[workflowIndex].status = status;
        state.workflows[workflowIndex].updatedAt = new Date().toISOString();
      }
    },
    
    addExecution: (state, action: PayloadAction<WorkflowExecution>) => {
      state.executions.unshift(action.payload);
      
      // Update workflow execution metadata
      const workflowIndex = state.workflows.findIndex(w => w.id === action.payload.workflowId);
      if (workflowIndex >= 0) {
        const workflow = state.workflows[workflowIndex];
        if (!workflow.metadata) workflow.metadata = {};
        workflow.metadata.executionCount = (workflow.metadata.executionCount || 0) + 1;
        workflow.metadata.lastExecuted = action.payload.startTime.toISOString();
      }
    },
    
    updateExecution: (state, action: PayloadAction<Partial<WorkflowExecution> & { id: string }>) => {
      const executionIndex = state.executions.findIndex(e => e.id === action.payload.id);
      if (executionIndex >= 0) {
        state.executions[executionIndex] = { ...state.executions[executionIndex], ...action.payload };
      }
    },
    
    addWorkflow: (state, action: PayloadAction<Workflow>) => {
      const existingIndex = state.workflows.findIndex(w => w.id === action.payload.id);
      if (existingIndex >= 0) {
        state.workflows[existingIndex] = action.payload;
      } else {
        state.workflows.unshift(action.payload);
      }
    },
    
    removeWorkflow: (state, action: PayloadAction<string>) => {
      const workflowId = action.payload;
      state.workflows = state.workflows.filter(w => w.id !== workflowId);
      
      if (state.selectedWorkflowId === workflowId) {
        state.selectedWorkflowId = null;
      }
      
      // Remove related executions
      state.executions = state.executions.filter(e => e.workflowId !== workflowId);
    },
    
    updateWorkflowMetadata: (state, action: PayloadAction<{ workflowId: string; metadata: any }>) => {
      const { workflowId, metadata } = action.payload;
      const workflowIndex = state.workflows.findIndex(w => w.id === workflowId);
      
      if (workflowIndex >= 0) {
        state.workflows[workflowIndex].metadata = {
          ...state.workflows[workflowIndex].metadata,
          ...metadata
        };
        state.workflows[workflowIndex].updatedAt = new Date().toISOString();
      }
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Bulk operations
    setWorkflows: (state, action: PayloadAction<Workflow[]>) => {
      state.workflows = action.payload;
    },
    
    setExecutions: (state, action: PayloadAction<WorkflowExecution[]>) => {
      state.executions = action.payload;
    },
    
    setTemplates: (state, action: PayloadAction<Workflow[]>) => {
      state.templates = action.payload;
    },
    
    setNodeTypes: (state, action: PayloadAction<WorkflowNodeType[]>) => {
      state.nodeTypes = action.payload;
    },
    
    // Real-time updates
    onWorkflowExecutionUpdate: (state, action: PayloadAction<{ executionId: string; update: Partial<WorkflowExecution> }>) => {
      const { executionId, update } = action.payload;
      const executionIndex = state.executions.findIndex(e => e.id === executionId);
      
      if (executionIndex >= 0) {
        state.executions[executionIndex] = {
          ...state.executions[executionIndex],
          ...update
        };
      }
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch workflows
      .addCase(fetchWorkflows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows = action.payload.data.workflows || [];
        if (action.payload.data.templates) {
          state.templates = action.payload.data.templates;
        }
        if (action.payload.data.nodeTypes) {
          state.nodeTypes = action.payload.data.nodeTypes;
        }
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create workflow
      .addCase(createWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows.unshift(action.payload.data.workflow);
        state.selectedWorkflowId = action.payload.data.workflow.id;
      })
      .addCase(createWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update workflow
      .addCase(updateWorkflow.pending, (state) => {
        state.error = null;
      })
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        const workflowIndex = state.workflows.findIndex(w => w.id === action.payload.data.workflow.id);
        if (workflowIndex >= 0) {
          state.workflows[workflowIndex] = action.payload.data.workflow;
        }
      })
      .addCase(updateWorkflow.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Delete workflow
      .addCase(deleteWorkflow.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.workflows = state.workflows.filter(w => w.id !== action.payload.workflowId);
        if (state.selectedWorkflowId === action.payload.workflowId) {
          state.selectedWorkflowId = null;
        }
        // Remove related executions
        state.executions = state.executions.filter(e => e.workflowId !== action.payload.workflowId);
      })
      .addCase(deleteWorkflow.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Clone workflow
      .addCase(cloneWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cloneWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows.unshift(action.payload.data.workflow);
        state.selectedWorkflowId = action.payload.data.workflow.id;
      })
      .addCase(cloneWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Execute workflow
      .addCase(executeWorkflow.pending, (state) => {
        state.error = null;
      })
      .addCase(executeWorkflow.fulfilled, (state, action) => {
        state.executions.unshift(action.payload.data.execution);
        
        // Update workflow execution count
        const workflowIndex = state.workflows.findIndex(w => w.id === action.payload.data.execution.workflowId);
        if (workflowIndex >= 0) {
          const workflow = state.workflows[workflowIndex];
          if (!workflow.metadata) workflow.metadata = {};
          workflow.metadata.executionCount = (workflow.metadata.executionCount || 0) + 1;
          workflow.metadata.lastExecuted = action.payload.data.execution.startTime.toISOString();
        }
      })
      .addCase(executeWorkflow.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch workflow executions
      .addCase(fetchWorkflowExecutions.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchWorkflowExecutions.fulfilled, (state, action) => {
        state.executions = action.payload.data.executions || [];
      })
      .addCase(fetchWorkflowExecutions.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch node types
      .addCase(fetchNodeTypes.fulfilled, (state, action) => {
        state.nodeTypes = action.payload.data.nodeTypes || [];
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Fetch workflow templates
      .addCase(fetchWorkflowTemplates.fulfilled, (state, action) => {
        state.templates = action.payload.data.templates || [];
      })
      .addCase(fetchWorkflowTemplates.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  }
});

export const {
  setSelectedWorkflow,
  updateWorkflowNodes,
  setWorkflowStatus,
  addExecution,
  updateExecution,
  addWorkflow,
  removeWorkflow,
  updateWorkflowMetadata,
  setError,
  clearError,
  setLoading,
  setWorkflows,
  setExecutions,
  setTemplates,
  setNodeTypes,
  onWorkflowExecutionUpdate
} = workflowSlice.actions;

export default workflowSlice.reducer;