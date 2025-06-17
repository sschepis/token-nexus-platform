import { createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { callCloudFunction, ApiResponse } from '../../utils/apiUtils';

/**
 * Generic state interface for async operations
 */
export interface AsyncState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Extended async state with specific loading flags
 */
export interface ExtendedAsyncState extends AsyncState {
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  isFetching?: boolean;
}

/**
 * Configuration for creating async thunks
 */
export interface AsyncThunkConfig<TParams = any, TReturn = any> {
  name: string;
  cloudFunction: string;
  transformParams?: (params: TParams) => Record<string, unknown>;
  transformResponse?: (response: any) => TReturn;
  errorMessage?: string;
}

/**
 * Factory for creating standardized async thunks
 */
export class AsyncThunkFactory {
  /**
   * Create a generic async thunk for cloud function calls
   */
  static create<TParams = any, TReturn = any>(
    config: AsyncThunkConfig<TParams, TReturn>
  ) {
    return createAsyncThunk<TReturn, TParams, { rejectValue: string }>(
      config.name,
      async (params, { rejectWithValue }) => {
        const transformedParams = config.transformParams ? config.transformParams(params) : params;
        
        const result = await callCloudFunction(
          config.cloudFunction,
          transformedParams as Record<string, unknown>,
          {
            showErrorToast: false, // Let the slice handle error display
            errorMessage: config.errorMessage
          }
        );

        if (!result.success) {
          return rejectWithValue(result.error || 'Operation failed');
        }

        return config.transformResponse ? config.transformResponse(result.data) : result.data;
      }
    );
  }

  /**
   * Create CRUD async thunks for a resource
   */
  static createCRUD<TItem = any>(resourceName: string, cloudFunctionPrefix?: string) {
    const prefix = cloudFunctionPrefix || resourceName;
    
    return {
      fetch: this.create<{ orgId?: string; [key: string]: any }, TItem[]>({
        name: `${resourceName}/fetch`,
        cloudFunction: `get${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`,
        transformResponse: (response) => response.data || response
      }),

      create: this.create<Partial<TItem>, TItem>({
        name: `${resourceName}/create`,
        cloudFunction: `create${prefix.charAt(0).toUpperCase() + prefix.slice(1).slice(0, -1)}`, // Remove 's' for singular
        transformResponse: (response) => response.data || response
      }),

      update: this.create<{ id: string; updates: Partial<TItem> }, TItem>({
        name: `${resourceName}/update`,
        cloudFunction: `update${prefix.charAt(0).toUpperCase() + prefix.slice(1).slice(0, -1)}`,
        transformParams: ({ id, updates }) => ({ [`${prefix.slice(0, -1)}Id`]: id, ...updates }),
        transformResponse: (response) => response.data || response
      }),

      delete: this.create<{ id: string }, { id: string }>({
        name: `${resourceName}/delete`,
        cloudFunction: `delete${prefix.charAt(0).toUpperCase() + prefix.slice(1).slice(0, -1)}`,
        transformParams: ({ id }) => ({ [`${prefix.slice(0, -1)}Id`]: id }),
        transformResponse: (response) => response
      })
    };
  }
}

/**
 * Utility for adding common async reducer patterns
 */
export class AsyncReducerBuilder {
  /**
   * Add standard pending/fulfilled/rejected cases for an async thunk
   */
  static addAsyncCase<TState extends AsyncState, TReturn = any>(
    builder: ActionReducerMapBuilder<TState>,
    asyncThunk: any,
    options: {
      loadingFlag?: keyof TState;
      onFulfilled?: (state: any, action: PayloadAction<TReturn>) => void;
      onRejected?: (state: any, action: PayloadAction<string | undefined>) => void;
    } = {}
  ) {
    const loadingFlag = options.loadingFlag || 'isLoading';

    builder
      .addCase(asyncThunk.pending, (state) => {
        (state as any)[loadingFlag] = true;
        state.error = null;
      })
      .addCase(asyncThunk.fulfilled, (state, action) => {
        (state as any)[loadingFlag] = false;
        state.error = null;
        if (options.onFulfilled) {
          options.onFulfilled(state, action);
        }
      })
      .addCase(asyncThunk.rejected, (state, action) => {
        (state as any)[loadingFlag] = false;
        state.error = action.payload || 'Operation failed';
        if (options.onRejected) {
          options.onRejected(state, action);
        }
      });
  }

  /**
   * Add CRUD reducer cases for a resource
   */
  static addCRUDCases<TState extends ExtendedAsyncState, TItem = any>(
    builder: ActionReducerMapBuilder<TState>,
    crudThunks: ReturnType<typeof AsyncThunkFactory.createCRUD>,
    options: {
      itemsField?: keyof TState;
      onItemCreated?: (state: TState, item: TItem) => void;
      onItemUpdated?: (state: TState, item: TItem) => void;
      onItemDeleted?: (state: TState, deletedId: string) => void;
    } = {}
  ) {
    const itemsField = options.itemsField || 'items';

    // Fetch cases
    this.addAsyncCase(builder, crudThunks.fetch, {
      loadingFlag: 'isFetching',
      onFulfilled: (state, action) => {
        (state as any)[itemsField] = action.payload;
      }
    });

    // Create cases
    this.addAsyncCase(builder, crudThunks.create, {
      loadingFlag: 'isCreating',
      onFulfilled: (state, action) => {
        if (options.onItemCreated) {
          options.onItemCreated(state, action.payload);
        } else if ((state as any)[itemsField]) {
          (state as any)[itemsField].push(action.payload);
        }
      }
    });

    // Update cases
    this.addAsyncCase(builder, crudThunks.update, {
      loadingFlag: 'isUpdating',
      onFulfilled: (state, action) => {
        if (options.onItemUpdated) {
          options.onItemUpdated(state, action.payload);
        } else if ((state as any)[itemsField]) {
          const items = (state as any)[itemsField];
          const index = items.findIndex((item: any) => item.id === action.payload.id);
          if (index !== -1) {
            items[index] = action.payload;
          }
        }
      }
    });

    // Delete cases
    this.addAsyncCase(builder, crudThunks.delete, {
      loadingFlag: 'isDeleting',
      onFulfilled: (state, action) => {
        if (options.onItemDeleted) {
          options.onItemDeleted(state, action.payload.id);
        } else if ((state as any)[itemsField]) {
          const items = (state as any)[itemsField];
          (state as any)[itemsField] = items.filter((item: any) => item.id !== action.payload.id);
        }
      }
    });
  }

  /**
   * Add batch operation cases
   */
  static addBatchCases<TState extends ExtendedAsyncState>(
    builder: ActionReducerMapBuilder<TState>,
    batchThunks: { [key: string]: any },
    options: {
      loadingFlag?: keyof TState;
    } = {}
  ) {
    const loadingFlag = options.loadingFlag || 'isLoading';

    Object.values(batchThunks).forEach(thunk => {
      this.addAsyncCase(builder, thunk, { loadingFlag });
    });
  }
}

/**
 * Helper for creating initial state with async properties
 */
export function createAsyncInitialState<T extends Record<string, any>>(
  additionalState: T,
  options: {
    includeExtended?: boolean;
  } = {}
): T & (ExtendedAsyncState | AsyncState) {
  const baseState: AsyncState = {
    isLoading: false,
    error: null
  };

  const extendedState: ExtendedAsyncState = {
    ...baseState,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isFetching: false
  };

  return {
    ...additionalState,
    ...(options.includeExtended ? extendedState : baseState)
  };
}

/**
 * Utility for creating selectors for async state
 */
export class AsyncSelectors {
  static createSelectors<TState extends AsyncState>(
    selectSlice: (state: any) => TState
  ) {
    return {
      selectIsLoading: (state: any) => selectSlice(state).isLoading,
      selectError: (state: any) => selectSlice(state).error,
      selectHasError: (state: any) => !!selectSlice(state).error
    };
  }

  static createExtendedSelectors<TState extends ExtendedAsyncState>(
    selectSlice: (state: any) => TState
  ) {
    return {
      ...this.createSelectors(selectSlice),
      selectIsCreating: (state: any) => selectSlice(state).isCreating || false,
      selectIsUpdating: (state: any) => selectSlice(state).isUpdating || false,
      selectIsDeleting: (state: any) => selectSlice(state).isDeleting || false,
      selectIsFetching: (state: any) => selectSlice(state).isFetching || false,
      selectIsAnyLoading: (state: any) => {
        const slice = selectSlice(state);
        return slice.isLoading || slice.isCreating || slice.isUpdating || slice.isDeleting || slice.isFetching || false;
      }
    };
  }
}