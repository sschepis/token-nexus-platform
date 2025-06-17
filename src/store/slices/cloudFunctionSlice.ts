import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { 
  AsyncThunkFactory, 
  AsyncReducerBuilder, 
  createAsyncInitialState,
  ExtendedAsyncState 
} from '../utils/createAsyncSliceUtils';
import { CloudFunction } from '../../types/cloud-functions';

/**
 * Cloud Function slice for managing Parse Cloud Functions
 * Provides full CRUD operations and deployment management for cloud functions
 */

// Parameter interfaces for async thunks
export interface CreateFunctionParams {
  name: string;
  description: string;
  code: string;
  language: 'javascript' | 'typescript';
  runtime: string;
  category: string;
  [key: string]: unknown;
}

export interface UpdateFunctionParams {
  functionId: string;
  name?: string;
  description?: string;
  code?: string;
  language?: 'javascript' | 'typescript';
  runtime?: string;
  category?: string;
  [key: string]: unknown;
}

export interface DeleteFunctionParams {
  functionId: string;
  [key: string]: unknown;
}

export interface DeployFunctionParams {
  functionId: string;
  environment?: 'development' | 'staging' | 'production';
  [key: string]: unknown;
}

export interface TestFunctionParams {
  functionId: string;
  testData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FetchFunctionLogsParams {
  functionId: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface FetchFunctionMetricsParams {
  functionId: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  [key: string]: unknown;
}

export interface FunctionMetrics {
  invocations: number;
  errors: number;
  averageExecutionTime: number;
  successRate: number;
  lastInvocation?: string;
}

export interface FunctionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  executionTime?: number;
  requestId?: string;
}

interface CloudFunctionState extends ExtendedAsyncState {
  functions: CloudFunction[];
  selectedFunctionId: string | null;
  
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
  isFetchingLogs: boolean;
  logsError: string | null;
  logs: FunctionLog[];
  isFetchingMetrics: boolean;
  metricsError: string | null;
  metrics: Record<string, FunctionMetrics>;
}

// Create async thunks using the factory
const cloudFunctionThunks = {
  fetchFunctions: AsyncThunkFactory.create<undefined, CloudFunction[]>({
    name: 'cloudFunction/fetchFunctions',
    cloudFunction: 'getCloudFunctions',
    transformParams: () => ({}),
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to fetch cloud functions'
  }),

  createFunction: AsyncThunkFactory.create<CreateFunctionParams, CloudFunction>({
    name: 'cloudFunction/createFunction',
    cloudFunction: 'createCloudFunction',
    transformParams: (params) => ({
      name: params.name,
      description: params.description,
      code: params.code,
      language: params.language,
      runtime: params.runtime,
      category: params.category
    }),
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to create cloud function'
  }),

  updateFunction: AsyncThunkFactory.create<UpdateFunctionParams, CloudFunction>({
    name: 'cloudFunction/updateFunction',
    cloudFunction: 'updateCloudFunction',
    transformParams: (params) => ({
      functionId: params.functionId,
      name: params.name,
      description: params.description,
      code: params.code,
      language: params.language,
      runtime: params.runtime,
      category: params.category
    }),
    transformResponse: (response: any) => response.data || response,
    errorMessage: 'Failed to update cloud function'
  }),

  deleteFunction: AsyncThunkFactory.create<DeleteFunctionParams, { functionId: string }>({
    name: 'cloudFunction/deleteFunction',
    cloudFunction: 'deleteCloudFunction',
    transformParams: (params) => ({ functionId: params.functionId }),
    transformResponse: (response: any) => ({ functionId: response.functionId || response.id }),
    errorMessage: 'Failed to delete cloud function'
  }),

  deployFunction: AsyncThunkFactory.create<DeployFunctionParams, { functionId: string; status: string; deployedAt: string }>({
    name: 'cloudFunction/deployFunction',
    cloudFunction: 'deployCloudFunction',
    transformParams: (params) => ({
      functionId: params.functionId,
      environment: params.environment || 'development'
    }),
    transformResponse: (response: any) => ({
      functionId: response.functionId || response.id,
      status: response.status || 'active',
      deployedAt: response.deployedAt || new Date().toISOString()
    }),
    errorMessage: 'Failed to deploy cloud function'
  }),

  testFunction: AsyncThunkFactory.create<TestFunctionParams, { result: any; functionId: string; executionTime: number }>({
    name: 'cloudFunction/testFunction',
    cloudFunction: 'testCloudFunction',
    transformParams: (params) => ({
      functionId: params.functionId,
      testData: params.testData || {}
    }),
    transformResponse: (response: any) => ({
      result: response.result || response.data,
      functionId: response.functionId || response.id,
      executionTime: response.executionTime || 0
    }),
    errorMessage: 'Failed to test cloud function'
  }),

  fetchFunctionLogs: AsyncThunkFactory.create<FetchFunctionLogsParams, FunctionLog[]>({
    name: 'cloudFunction/fetchFunctionLogs',
    cloudFunction: 'getCloudFunctionLogs',
    transformParams: (params) => ({
      functionId: params.functionId,
      limit: params.limit || 100,
      startDate: params.startDate,
      endDate: params.endDate
    }),
    transformResponse: (response: any) => response.logs || response.data || [],
    errorMessage: 'Failed to fetch function logs'
  }),

  fetchFunctionMetrics: AsyncThunkFactory.create<FetchFunctionMetricsParams, { functionId: string; metrics: FunctionMetrics }>({
    name: 'cloudFunction/fetchFunctionMetrics',
    cloudFunction: 'getCloudFunctionMetrics',
    transformParams: (params) => ({
      functionId: params.functionId,
      timeRange: params.timeRange || '24h'
    }),
    transformResponse: (response: any) => ({
      functionId: response.functionId || response.id,
      metrics: response.metrics || response.data
    }),
    errorMessage: 'Failed to fetch function metrics'
  })
};

// Export thunks for backward compatibility
export const {
  fetchFunctions,
  createFunction,
  updateFunction,
  deleteFunction,
  deployFunction,
  testFunction,
  fetchFunctionLogs,
  fetchFunctionMetrics
} = cloudFunctionThunks;

const initialState: CloudFunctionState = createAsyncInitialState({
  functions: [],
  selectedFunctionId: null,
  
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
  isFetchingLogs: false,
  logsError: null,
  logs: [],
  isFetchingMetrics: false,
  metricsError: null,
  metrics: {}
}, { includeExtended: true });

export const cloudFunctionSlice = createSlice({
  name: 'cloudFunction',
  initialState,
  reducers: {
    setSelectedFunction: (state, action: PayloadAction<string | null>) => {
      state.selectedFunctionId = action.payload;
    },
    
    bindFunctionToRoute: (state, action: PayloadAction<{ functionId: string, routeId: string }>) => {
      const { functionId, routeId } = action.payload;
      const functionIndex = state.functions.findIndex(func => func.id === functionId);
      
      if (functionIndex >= 0) {
        if (!state.functions[functionIndex].boundRoutes) {
          state.functions[functionIndex].boundRoutes = [];
        }
        
        if (!state.functions[functionIndex].boundRoutes?.includes(routeId)) {
          state.functions[functionIndex].boundRoutes?.push(routeId);
          state.functions[functionIndex].updatedAt = new Date().toISOString();
        }
      }
    },
    
    unbindFunctionFromRoute: (state, action: PayloadAction<{ functionId: string, routeId: string }>) => {
      const { functionId, routeId } = action.payload;
      const functionIndex = state.functions.findIndex(func => func.id === functionId);
      
      if (functionIndex >= 0 && state.functions[functionIndex].boundRoutes) {
        state.functions[functionIndex].boundRoutes = state.functions[functionIndex].boundRoutes?.filter(id => id !== routeId);
        state.functions[functionIndex].updatedAt = new Date().toISOString();
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

    clearLogsError: (state) => {
      state.logsError = null;
    },

    clearMetricsError: (state) => {
      state.metricsError = null;
    },

    clearTestResult: (state) => {
      state.testResult = null;
    },

    clearLogs: (state) => {
      state.logs = [];
    },

    clearAllErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.updateError = null;
      state.deleteError = null;
      state.deployError = null;
      state.testError = null;
      state.logsError = null;
      state.metricsError = null;
    }
  },
  
  extraReducers: (builder) => {
    // Fetch functions
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.fetchFunctions, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        state.functions = action.payload;
      }
    });

    // Create function
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.createFunction, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        state.functions.push(action.payload);
        state.createError = null;
      },
      onRejected: (state, action) => {
        state.createError = action.payload as string;
      }
    });

    // Update function
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.updateFunction, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        const functionIndex = state.functions.findIndex(func => func.id === action.payload.id);
        if (functionIndex >= 0) {
          state.functions[functionIndex] = action.payload;
        }
        state.updateError = null;
      },
      onRejected: (state, action) => {
        state.updateError = action.payload as string;
      }
    });

    // Delete function
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.deleteFunction, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        state.functions = state.functions.filter(func => func.id !== action.payload.functionId);
        if (state.selectedFunctionId === action.payload.functionId) {
          state.selectedFunctionId = null;
        }
        state.deleteError = null;
      },
      onRejected: (state, action) => {
        state.deleteError = action.payload as string;
      }
    });

    // Deploy function
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.deployFunction, {
      loadingFlag: 'isDeploying',
      onFulfilled: (state, action) => {
        const functionIndex = state.functions.findIndex(func => func.id === action.payload.functionId);
        if (functionIndex >= 0) {
          state.functions[functionIndex].status = 'active';
          state.functions[functionIndex].updatedAt = action.payload.deployedAt;
        }
        state.deployError = null;
      },
      onRejected: (state, action) => {
        state.deployError = action.payload as string;
      }
    });

    // Test function
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.testFunction, {
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

    // Fetch function logs
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.fetchFunctionLogs, {
      loadingFlag: 'isFetchingLogs',
      onFulfilled: (state, action) => {
        state.logs = action.payload;
        state.logsError = null;
      },
      onRejected: (state, action) => {
        state.logsError = action.payload as string;
      }
    });

    // Fetch function metrics
    AsyncReducerBuilder.addAsyncCase(builder, cloudFunctionThunks.fetchFunctionMetrics, {
      loadingFlag: 'isFetchingMetrics',
      onFulfilled: (state, action) => {
        state.metrics[action.payload.functionId] = action.payload.metrics;
        state.metricsError = null;
      },
      onRejected: (state, action) => {
        state.metricsError = action.payload as string;
      }
    });
  },
});

export const { 
  setSelectedFunction,
  bindFunctionToRoute,
  unbindFunctionFromRoute,
  clearCreateError,
  clearUpdateError,
  clearDeleteError,
  clearDeployError,
  clearTestError,
  clearLogsError,
  clearMetricsError,
  clearTestResult,
  clearLogs,
  clearAllErrors
} = cloudFunctionSlice.actions;

export default cloudFunctionSlice.reducer;
