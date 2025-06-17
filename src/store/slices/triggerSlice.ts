import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { ParseTrigger, TriggerState, CreateTriggerRequest, UpdateTriggerRequest } from '@/types/triggers';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';

/**
 * Refactored Trigger slice using AsyncThunkFactory utilities
 * This eliminates repetitive async patterns and provides consistent error handling
 */

// Parameter interfaces for async thunks
export interface FetchTriggersParams {
  className?: string;
  triggerType?: ParseTrigger['triggerType'];
  status?: ParseTrigger['status'];
  [key: string]: unknown;
}

export interface DeployTriggerParams {
  triggerId: string;
  [key: string]: unknown;
}

export interface TestTriggerParams {
  triggerId: string;
  testData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ToggleTriggerStatusParams {
  triggerId: string;
  status: ParseTrigger['status'];
  [key: string]: unknown;
}

interface EnhancedTriggerState extends ExtendedAsyncState {
  triggers: ParseTrigger[];
  selectedTriggerId: string | null;
  availableClasses: string[];
  
  // Specific loading states for different operations
  isCreating: boolean;
  createError: string | null;
  isUpdating: boolean;
  updateError: string | null;
  isDeleting: boolean;
  deleteError: string | null;
  isDeploying: boolean;
  deployError: string | null;
  isTesting: boolean;
  testError: string | null;
  testResult: any;
  isToggling: boolean;
  toggleError: string | null;
}

// Create async thunks using the factory
const triggerThunks = {
  fetchTriggers: AsyncThunkFactory.create<FetchTriggersParams | undefined, ParseTrigger[]>({
    name: 'trigger/fetchTriggers',
    cloudFunction: 'getParseTriggers',
    transformParams: (params) => (params || {}) as Record<string, unknown>,
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to fetch Parse triggers'
  }),

  createTrigger: AsyncThunkFactory.create<CreateTriggerRequest, ParseTrigger>({
    name: 'trigger/createTrigger',
    cloudFunction: 'createParseTrigger',
    transformParams: (params) => ({
      name: params.name,
      description: params.description,
      className: params.className,
      triggerType: params.triggerType,
      code: params.code,
      tags: params.tags || []
    }),
    transformResponse: (response: any) => ({
      id: response.id || response.objectId,
      ...response,
      status: 'draft',
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString(),
      version: 1,
      executionCount: 0
    }),
    errorMessage: 'Failed to create Parse trigger'
  }),

  updateTrigger: AsyncThunkFactory.create<UpdateTriggerRequest, ParseTrigger>({
    name: 'trigger/updateTrigger',
    cloudFunction: 'updateParseTrigger',
    transformParams: (params) => {
      const updateParams: any = {
        triggerId: params.id
      };
      
      // Only include fields that are provided
      if (params.name !== undefined) updateParams.name = params.name;
      if (params.description !== undefined) updateParams.description = params.description;
      if (params.code !== undefined) updateParams.code = params.code;
      if (params.tags !== undefined) updateParams.tags = params.tags;
      
      return updateParams;
    },
    transformResponse: (response: any) => ({
      ...response,
      id: response.id || response.objectId,
      updatedAt: new Date().toISOString(),
      version: (response.version || 1) + 1
    }),
    errorMessage: 'Failed to update Parse trigger'
  }),

  deleteTrigger: AsyncThunkFactory.create<string, { triggerId: string }>({
    name: 'trigger/deleteTrigger',
    cloudFunction: 'deleteParseTrigger',
    transformParams: (triggerId: string) => ({ triggerId }),
    transformResponse: (response: any) => ({ triggerId: response.triggerId || response.id }),
    errorMessage: 'Failed to delete Parse trigger'
  }),

  deployTrigger: AsyncThunkFactory.create<DeployTriggerParams, { triggerId: string; status: string; deployedAt: string }>({
    name: 'trigger/deployTrigger',
    cloudFunction: 'deployParseTrigger',
    transformParams: (params) => ({ triggerId: params.triggerId }),
    transformResponse: (response: any) => ({
      triggerId: response.triggerId || response.id,
      status: response.status || 'active',
      deployedAt: response.deployedAt || new Date().toISOString()
    }),
    errorMessage: 'Failed to deploy Parse trigger'
  }),

  testTrigger: AsyncThunkFactory.create<TestTriggerParams, { triggerId: string; result: any; executionTime: number }>({
    name: 'trigger/testTrigger',
    cloudFunction: 'testParseTrigger',
    transformParams: (params) => ({
      triggerId: params.triggerId,
      testData: params.testData || {}
    }),
    transformResponse: (response: any) => ({
      triggerId: response.triggerId || response.id,
      result: response.result || response.data,
      executionTime: response.executionTime || 0
    }),
    errorMessage: 'Failed to test Parse trigger'
  }),

  toggleTriggerStatus: AsyncThunkFactory.create<ToggleTriggerStatusParams, { triggerId: string; status: ParseTrigger['status'] }>({
    name: 'trigger/toggleTriggerStatus',
    cloudFunction: 'toggleParseTriggerStatus',
    transformParams: (params) => ({
      triggerId: params.triggerId,
      status: params.status
    }),
    transformResponse: (response: any) => ({
      triggerId: response.triggerId || response.id,
      status: response.status
    }),
    errorMessage: 'Failed to toggle trigger status'
  }),

  fetchAvailableClasses: AsyncThunkFactory.create<void, string[]>({
    name: 'trigger/fetchAvailableClasses',
    cloudFunction: 'getAvailableParseClasses',
    transformParams: () => ({}),
    transformResponse: (response: any) => response.classes || response.data || [],
    errorMessage: 'Failed to fetch available Parse classes'
  })
};

// Export thunks for backward compatibility
export const {
  fetchTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  deployTrigger,
  testTrigger,
  toggleTriggerStatus,
  fetchAvailableClasses
} = triggerThunks;

const initialState: EnhancedTriggerState = createAsyncInitialState({
  triggers: [
    {
      id: uuidv4(),
      name: 'validateUserEmail',
      description: 'Validates user email format before saving',
      className: 'User',
      triggerType: 'beforeSave',
      code: `Parse.Cloud.beforeSave("User", (request) => {
  const user = request.object;
  const email = user.get("email");
  
  if (email && !email.includes("@")) {
    throw new Error("Invalid email format");
  }
  
  // Auto-lowercase email
  if (email) {
    user.set("email", email.toLowerCase());
  }
});`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      executionCount: 1250,
      tags: ['validation', 'user']
    },
    {
      id: uuidv4(),
      name: 'logPostCreation',
      description: 'Logs when a new post is created',
      className: 'Post',
      triggerType: 'afterSave',
      code: `Parse.Cloud.afterSave("Post", (request) => {
  const post = request.object;
  const user = request.user;
  
  if (post.existed()) {
    return; // Only log new posts
  }
  
  console.log(\`New post created: \${post.id} by user \${user ? user.id : 'anonymous'}\`);
  
  // Could send notification, update analytics, etc.
});`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      executionCount: 890,
      tags: ['logging', 'post']
    }
  ],
  selectedTriggerId: null,
  availableClasses: ['User', 'Post', 'Comment', 'Product', 'Order', 'Category'],
  
  // Specific loading states
  isCreating: false,
  createError: null,
  isUpdating: false,
  updateError: null,
  isDeleting: false,
  deleteError: null,
  isDeploying: false,
  deployError: null,
  isTesting: false,
  testError: null,
  testResult: null,
  isToggling: false,
  toggleError: null
}, { includeExtended: true });

export const triggerSlice = createSlice({
  name: 'trigger',
  initialState,
  reducers: {
    setSelectedTrigger: (state, action: PayloadAction<string | null>) => {
      state.selectedTriggerId = action.payload;
    },
    
    incrementTriggerExecution: (state, action: PayloadAction<{ id: string; success: boolean }>) => {
      const { id, success } = action.payload;
      const triggerIndex = state.triggers.findIndex(trigger => trigger.id === id);
      
      if (triggerIndex >= 0) {
        state.triggers[triggerIndex].executionCount = (state.triggers[triggerIndex].executionCount || 0) + 1;
        state.triggers[triggerIndex].lastExecuted = new Date().toISOString();
        
        if (!success) {
          state.triggers[triggerIndex].errorCount = (state.triggers[triggerIndex].errorCount || 0) + 1;
        }
      }
    },

    clearCreateError: (state) => {
      state.createError = null;
    },

    clearUpdateError: (state) => {
      state.updateError = null;
    },

    clearDeleteError: (state) => {
      state.deleteError = null;
    },

    clearDeployError: (state) => {
      state.deployError = null;
    },

    clearTestError: (state) => {
      state.testError = null;
    },

    clearToggleError: (state) => {
      state.toggleError = null;
    },

    clearTestResult: (state) => {
      state.testResult = null;
    },

    clearAllErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.deployError = null;
      state.testError = null;
      state.toggleError = null;
    }
  },
  
  extraReducers: (builder) => {
    // Fetch triggers
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.fetchTriggers, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.triggers = action.payload;
      }
    });

    // Create trigger
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.createTrigger, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        state.triggers.push(action.payload);
        state.createError = null;
      },
      onRejected: (state, action) => {
        state.createError = action.payload as string;
      }
    });

    // Update trigger
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.updateTrigger, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        const triggerIndex = state.triggers.findIndex(trigger => trigger.id === action.payload.id);
        if (triggerIndex >= 0) {
          state.triggers[triggerIndex] = action.payload;
        }
        state.updateError = null;
      },
      onRejected: (state, action) => {
        state.updateError = action.payload as string;
      }
    });

    // Delete trigger
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.deleteTrigger, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        state.triggers = state.triggers.filter(trigger => trigger.id !== action.payload.triggerId);
        if (state.selectedTriggerId === action.payload.triggerId) {
          state.selectedTriggerId = null;
        }
        state.deleteError = null;
      },
      onRejected: (state, action) => {
        state.deleteError = action.payload as string;
      }
    });

    // Deploy trigger
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.deployTrigger, {
      loadingFlag: 'isDeploying',
      onFulfilled: (state, action) => {
        const triggerIndex = state.triggers.findIndex(trigger => trigger.id === action.payload.triggerId);
        if (triggerIndex >= 0) {
          state.triggers[triggerIndex].status = 'active';
          state.triggers[triggerIndex].updatedAt = action.payload.deployedAt;
        }
        state.deployError = null;
      },
      onRejected: (state, action) => {
        state.deployError = action.payload as string;
      }
    });

    // Test trigger
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.testTrigger, {
      loadingFlag: 'isTesting',
      onFulfilled: (state, action) => {
        state.testResult = {
          result: action.payload.result,
          executionTime: action.payload.executionTime,
          timestamp: new Date().toISOString()
        };
        state.testError = null;
      },
      onRejected: (state, action) => {
        state.testError = action.payload as string;
        state.testResult = null;
      }
    });

    // Toggle trigger status
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.toggleTriggerStatus, {
      loadingFlag: 'isToggling',
      onFulfilled: (state, action) => {
        const triggerIndex = state.triggers.findIndex(trigger => trigger.id === action.payload.triggerId);
        if (triggerIndex >= 0) {
          state.triggers[triggerIndex].status = action.payload.status;
          state.triggers[triggerIndex].updatedAt = new Date().toISOString();
        }
        state.toggleError = null;
      },
      onRejected: (state, action) => {
        state.toggleError = action.payload as string;
      }
    });

    // Fetch available classes
    AsyncReducerBuilder.addAsyncCase(builder, triggerThunks.fetchAvailableClasses, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.availableClasses = action.payload;
      }
    });
  },
});

export const { 
  setSelectedTrigger,
  incrementTriggerExecution,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearDeployError,
  clearTestError,
  clearToggleError,
  clearTestResult,
  clearAllErrors
} = triggerSlice.actions;

export default triggerSlice.reducer;