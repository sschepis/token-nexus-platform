import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';

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

interface AiAssistantState {
  scheduledTasks: ScheduledTask[];
  isLoadingTasks: boolean;
  isCreatingTask: boolean;
  isUpdatingTask: boolean;
  isDeletingTask: boolean;
  error: string | null;
}

const initialState: AiAssistantState = {
  scheduledTasks: [],
  isLoadingTasks: false,
  isCreatingTask: false,
  isUpdatingTask: false,
  isDeletingTask: false,
  error: null,
};

// Async Thunks
export const fetchScheduledTasks = createAsyncThunk(
  'aiAssistant/fetchScheduledTasks',
  async (params?: { limit?: number; skip?: number; isActive?: boolean }) => {
    const response = await apiService.aiAssistant.getScheduledTasks(params);
    return response.data.tasks as ScheduledTask[];
  }
);

export const createScheduledTask = createAsyncThunk(
  'aiAssistant/createScheduledTask',
  async (taskData: {
    name: string;
    description: string;
    cronExpression: string;
    actionDetails: Record<string, unknown>;
  }) => {
    const response = await apiService.aiAssistant.createScheduledTask(taskData);
    return response.data.task as ScheduledTask;
  }
);

export const updateScheduledTask = createAsyncThunk(
  'aiAssistant/updateScheduledTask',
  async ({ taskId, updates }: {
    taskId: string;
    updates: {
      name?: string;
      description?: string;
      cronExpression?: string;
      actionDetails?: Record<string, unknown>;
      isActive?: boolean;
    };
  }) => {
    const response = await apiService.aiAssistant.updateScheduledTask(taskId, updates);
    return response.data.task as ScheduledTask;
  }
);

export const deleteScheduledTask = createAsyncThunk(
  'aiAssistant/deleteScheduledTask',
  async (taskId: string) => {
    await apiService.aiAssistant.deleteScheduledTask(taskId);
    return taskId;
  }
);

const aiAssistantSlice = createSlice({
  name: 'aiAssistant',
  initialState,
  reducers: {
    clearAiAssistantErrors: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchScheduledTasks
      .addCase(fetchScheduledTasks.pending, (state) => {
        state.isLoadingTasks = true;
        state.error = null;
      })
      .addCase(fetchScheduledTasks.fulfilled, (state, action: PayloadAction<ScheduledTask[]>) => {
        state.isLoadingTasks = false;
        state.scheduledTasks = action.payload;
      })
      .addCase(fetchScheduledTasks.rejected, (state, action) => {
        state.isLoadingTasks = false;
        state.error = action.error.message || 'Failed to fetch scheduled tasks';
      })
      // createScheduledTask
      .addCase(createScheduledTask.pending, (state) => {
        state.isCreatingTask = true;
        state.error = null;
      })
      .addCase(createScheduledTask.fulfilled, (state, action: PayloadAction<ScheduledTask>) => {
        state.isCreatingTask = false;
        state.scheduledTasks.push(action.payload);
      })
      .addCase(createScheduledTask.rejected, (state, action) => {
        state.isCreatingTask = false;
        state.error = action.error.message || 'Failed to create scheduled task';
      })
      // updateScheduledTask
      .addCase(updateScheduledTask.pending, (state) => {
        state.isUpdatingTask = true;
        state.error = null;
      })
      .addCase(updateScheduledTask.fulfilled, (state, action: PayloadAction<ScheduledTask>) => {
        state.isUpdatingTask = false;
        const index = state.scheduledTasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.scheduledTasks[index] = action.payload;
        }
      })
      .addCase(updateScheduledTask.rejected, (state, action) => {
        state.isUpdatingTask = false;
        state.error = action.error.message || 'Failed to update scheduled task';
      })
      // deleteScheduledTask
      .addCase(deleteScheduledTask.pending, (state) => {
        state.isDeletingTask = true;
        state.error = null;
      })
      .addCase(deleteScheduledTask.fulfilled, (state, action: PayloadAction<string>) => {
        state.isDeletingTask = false;
        state.scheduledTasks = state.scheduledTasks.filter(task => task.id !== action.payload);
      })
      .addCase(deleteScheduledTask.rejected, (state, action) => {
        state.isDeletingTask = false;
        state.error = action.error.message || 'Failed to delete scheduled task';
      });
  },
});

export const { clearAiAssistantErrors } = aiAssistantSlice.actions;
export default aiAssistantSlice.reducer;