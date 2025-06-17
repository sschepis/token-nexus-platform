import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored AI Assistant slice using AsyncThunkFactory utilities
 * This eliminates all the repetitive createAsyncThunk and error handling patterns
 */

// Define the interface for a ScheduledTask, based on the plan and current usage
export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  actionDetails: Record<string, unknown>; // e.g., query for the AI, tool to call
  lastRun?: Date;
  nextRun?: Date;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledTaskParams {
  name: string;
  description: string;
  cronExpression: string;
  actionDetails: Record<string, unknown>;
}

export interface UpdateScheduledTaskParams {
  taskId: string;
  updates: {
    name?: string;
    description?: string;
    cronExpression?: string;
    actionDetails?: Record<string, unknown>;
    isActive?: boolean;
  };
}

export interface FetchScheduledTasksParams {
  limit?: number;
  skip?: number;
  isActive?: boolean;
  [key: string]: unknown; // Add index signature for Record<string, unknown> compatibility
}

interface AiAssistantState extends ExtendedAsyncState {
  scheduledTasks: ScheduledTask[];
}

// Create async thunks using the factory
const aiAssistantThunks = {
  fetchScheduledTasks: AsyncThunkFactory.create<FetchScheduledTasksParams | undefined, ScheduledTask[]>({
    name: 'aiAssistant/fetchScheduledTasks',
    cloudFunction: 'getScheduledTasks',
    transformParams: (params) => (params || {}) as Record<string, unknown>,
    transformResponse: (response: any) => response.tasks || response.data?.tasks || response,
    errorMessage: 'Failed to fetch scheduled tasks'
  }),

  createScheduledTask: AsyncThunkFactory.create<CreateScheduledTaskParams, ScheduledTask>({
    name: 'aiAssistant/createScheduledTask',
    cloudFunction: 'createScheduledTask',
    transformResponse: (response: any) => response.task || response.data?.task || response,
    errorMessage: 'Failed to create scheduled task'
  }),

  updateScheduledTask: AsyncThunkFactory.create<UpdateScheduledTaskParams, ScheduledTask>({
    name: 'aiAssistant/updateScheduledTask',
    cloudFunction: 'updateScheduledTask',
    transformParams: (params) => ({
      taskId: params.taskId,
      ...params.updates
    }),
    transformResponse: (response: any) => response.task || response.data?.task || response,
    errorMessage: 'Failed to update scheduled task'
  }),

  deleteScheduledTask: AsyncThunkFactory.create<string, { taskId: string }>({
    name: 'aiAssistant/deleteScheduledTask',
    cloudFunction: 'deleteScheduledTask',
    transformParams: (taskId: string) => ({ taskId }),
    transformResponse: (response: any) => ({ taskId: response.taskId || response.id || response }),
    errorMessage: 'Failed to delete scheduled task'
  })
};

// Export thunks for backward compatibility
export const {
  fetchScheduledTasks,
  createScheduledTask,
  updateScheduledTask,
  deleteScheduledTask
} = aiAssistantThunks;

const initialState: AiAssistantState = createAsyncInitialState({
  scheduledTasks: []
}, { includeExtended: true });

const aiAssistantSlice = createSlice({
  name: 'aiAssistant',
  initialState,
  reducers: {
    clearAiAssistantErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch scheduled tasks using AsyncReducerBuilder
    AsyncReducerBuilder.addAsyncCase(builder, aiAssistantThunks.fetchScheduledTasks, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.scheduledTasks = action.payload;
      }
    });

    // Create scheduled task
    AsyncReducerBuilder.addAsyncCase(builder, aiAssistantThunks.createScheduledTask, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        state.scheduledTasks.push(action.payload);
      }
    });

    // Update scheduled task
    AsyncReducerBuilder.addAsyncCase(builder, aiAssistantThunks.updateScheduledTask, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        const index = state.scheduledTasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.scheduledTasks[index] = action.payload;
        }
      }
    });

    // Delete scheduled task
    AsyncReducerBuilder.addAsyncCase(builder, aiAssistantThunks.deleteScheduledTask, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        const taskId = action.payload.taskId;
        state.scheduledTasks = state.scheduledTasks.filter(task => task.id !== taskId);
      }
    });
  },
});

export const { clearAiAssistantErrors } = aiAssistantSlice.actions;
export default aiAssistantSlice.reducer;

// Selectors
export const selectScheduledTasks = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.scheduledTasks;
export const selectAiAssistantLoading = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.isLoading;
export const selectAiAssistantError = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.error;
export const selectIsCreatingTask = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.isCreating;
export const selectIsUpdatingTask = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.isUpdating;
export const selectIsDeletingTask = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.isDeleting;
export const selectIsFetchingTasks = (state: { aiAssistant: AiAssistantState }) => state.aiAssistant.isFetching;