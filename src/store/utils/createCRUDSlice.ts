import { createSlice, createAsyncThunk, PayloadAction, SliceCaseReducers, ValidateSliceCaseReducers } from '@reduxjs/toolkit';

// Generic CRUD State interface
export interface CRUDState<T> {
  items: T[];
  selectedItem: T | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  filters: Record<string, any>;
  [key: string]: any; // Allow additional custom properties
}

// API Service interface that CRUD operations expect
export interface CRUDApiService<T, CreateParams = Partial<T>, UpdateParams = Partial<T>> {
  getAll: (params?: any) => Promise<{ data: { items?: T[]; [key: string]: any; totalCount?: number; hasMore?: boolean } }>;
  getById: (id: string) => Promise<{ data: { item?: T; [key: string]: any } }>;
  create: (params: CreateParams) => Promise<{ data: { item?: T; [key: string]: any } }>;
  update: (id: string, params: UpdateParams) => Promise<{ data: { item?: T; [key: string]: any } }>;
  delete: (id: string) => Promise<{ data: any }>;
}

// Configuration for creating a CRUD slice
export interface CRUDSliceConfig<T, CreateParams = Partial<T>, UpdateParams = Partial<T>> {
  name: string;
  apiService: CRUDApiService<T, CreateParams, UpdateParams>;
  initialState?: Partial<CRUDState<T>>;
  reducers?: ValidateSliceCaseReducers<CRUDState<T>, SliceCaseReducers<CRUDState<T>>>;
  // Custom field mappings for API responses
  responseMapping?: {
    items?: string; // field name in response that contains items array
    item?: string;  // field name in response that contains single item
    totalCount?: string;
    hasMore?: string;
  };
  // Custom error messages
  errorMessages?: {
    fetch?: string;
    create?: string;
    update?: string;
    delete?: string;
    getById?: string;
  };
}

// Default initial state factory
const createInitialState = <T>(customState?: Partial<CRUDState<T>>): CRUDState<T> => ({
  items: [],
  selectedItem: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  totalCount: 0,
  hasMore: false,
  filters: {},
  ...customState,
});

// Main factory function to create CRUD slice
export function createCRUDSlice<T, CreateParams = Partial<T>, UpdateParams = Partial<T>>(
  config: CRUDSliceConfig<T, CreateParams, UpdateParams>
) {
  const {
    name,
    apiService,
    initialState: customInitialState,
    reducers: customReducers,
    responseMapping = {},
    errorMessages = {},
  } = config;

  // Create initial state
  const initialState = createInitialState<T>(customInitialState);

  // Response field mappings with defaults
  const mapping = {
    items: responseMapping.items || 'items',
    item: responseMapping.item || 'item',
    totalCount: responseMapping.totalCount || 'totalCount',
    hasMore: responseMapping.hasMore || 'hasMore',
  };

  // Error messages with defaults
  const errors = {
    fetch: errorMessages.fetch || `Failed to fetch ${name}`,
    create: errorMessages.create || `Failed to create ${name}`,
    update: errorMessages.update || `Failed to update ${name}`,
    delete: errorMessages.delete || `Failed to delete ${name}`,
    getById: errorMessages.getById || `Failed to fetch ${name} details`,
  };

  // Create async thunks
  const fetchItems = createAsyncThunk(
    `${name}/fetchItems`,
    async (params?: any) => {
      const response = await apiService.getAll(params);
      return {
        items: response.data[mapping.items] || response.data,
        totalCount: response.data[mapping.totalCount] || 0,
        hasMore: response.data[mapping.hasMore] || false,
      };
    }
  );

  const fetchItemById = createAsyncThunk(
    `${name}/fetchItemById`,
    async (id: string) => {
      const response = await apiService.getById(id);
      return response.data[mapping.item] || response.data;
    }
  );

  const createItem = createAsyncThunk(
    `${name}/createItem`,
    async (params: CreateParams) => {
      const response = await apiService.create(params);
      return response.data[mapping.item] || response.data;
    }
  );

  const updateItem = createAsyncThunk(
    `${name}/updateItem`,
    async ({ id, params }: { id: string; params: UpdateParams }) => {
      const response = await apiService.update(id, params);
      return response.data[mapping.item] || response.data;
    }
  );

  const deleteItem = createAsyncThunk(
    `${name}/deleteItem`,
    async (id: string) => {
      await apiService.delete(id);
      return id;
    }
  );

  // Create the slice
  const slice = createSlice({
    name,
    initialState,
    reducers: {
      // Standard reducers
      clearError: (state) => {
        state.error = null;
      },
      setFilters: (state, action: PayloadAction<Record<string, any>>) => {
        state.filters = { ...state.filters, ...action.payload };
      },
      resetFilters: (state) => {
        state.filters = {};
      },
      clearSelectedItem: (state) => {
        state.selectedItem = null;
      },
      // Merge custom reducers
      ...customReducers,
    },
    extraReducers: (builder) => {
      builder
        // Fetch items
        .addCase(fetchItems.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(fetchItems.fulfilled, (state, action) => {
          state.isLoading = false;
          state.items = action.payload.items;
          state.totalCount = action.payload.totalCount;
          state.hasMore = action.payload.hasMore;
        })
        .addCase(fetchItems.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || errors.fetch;
        })

        // Fetch item by ID
        .addCase(fetchItemById.pending, (state) => {
          state.isLoading = true;
          state.error = null;
          state.selectedItem = null;
        })
        .addCase(fetchItemById.fulfilled, (state, action) => {
          state.isLoading = false;
          state.selectedItem = action.payload;
        })
        .addCase(fetchItemById.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || errors.getById;
        })

        // Create item
        .addCase(createItem.pending, (state) => {
          state.isCreating = true;
          state.error = null;
        })
        .addCase(createItem.fulfilled, (state, action) => {
          state.isCreating = false;
          state.items.unshift(action.payload);
        })
        .addCase(createItem.rejected, (state, action) => {
          state.isCreating = false;
          state.error = action.error.message || errors.create;
        })

        // Update item
        .addCase(updateItem.pending, (state) => {
          state.isUpdating = true;
          state.error = null;
        })
        .addCase(updateItem.fulfilled, (state, action) => {
          state.isUpdating = false;
          const index = state.items.findIndex((item: any) => item.id === action.payload.id);
          if (index !== -1) {
            state.items[index] = action.payload;
          }
          if (state.selectedItem && (state.selectedItem as any).id === action.payload.id) {
            state.selectedItem = action.payload;
          }
        })
        .addCase(updateItem.rejected, (state, action) => {
          state.isUpdating = false;
          state.error = action.error.message || errors.update;
        })

        // Delete item
        .addCase(deleteItem.pending, (state) => {
          state.isDeleting = true;
          state.error = null;
        })
        .addCase(deleteItem.fulfilled, (state, action) => {
          state.isDeleting = false;
          state.items = state.items.filter((item: any) => item.id !== action.payload);
          if (state.selectedItem && (state.selectedItem as any).id === action.payload) {
            state.selectedItem = null;
          }
        })
        .addCase(deleteItem.rejected, (state, action) => {
          state.isDeleting = false;
          state.error = action.error.message || errors.delete;
        });
    },
  });

  // Return the slice with thunks and selectors
  return {
    slice,
    actions: {
      ...slice.actions,
      fetchItems,
      fetchItemById,
      createItem,
      updateItem,
      deleteItem,
    },
    // Standard selectors
    selectors: {
      selectItems: (state: any) => state[name].items,
      selectSelectedItem: (state: any) => state[name].selectedItem,
      selectIsLoading: (state: any) => state[name].isLoading,
      selectIsCreating: (state: any) => state[name].isCreating,
      selectIsUpdating: (state: any) => state[name].isUpdating,
      selectIsDeleting: (state: any) => state[name].isDeleting,
      selectError: (state: any) => state[name].error,
      selectTotalCount: (state: any) => state[name].totalCount,
      selectHasMore: (state: any) => state[name].hasMore,
      selectFilters: (state: any) => state[name].filters,
    },
  };
}

// Helper function to create API service adapter
export function createApiServiceAdapter<T, CreateParams = Partial<T>, UpdateParams = Partial<T>>(
  baseService: any,
  config: {
    getAllMethod?: string;
    getByIdMethod?: string;
    createMethod?: string;
    updateMethod?: string;
    deleteMethod?: string;
  } = {}
): CRUDApiService<T, CreateParams, UpdateParams> {
  const {
    getAllMethod = 'getAll',
    getByIdMethod = 'getById',
    createMethod = 'create',
    updateMethod = 'update',
    deleteMethod = 'delete',
  } = config;

  return {
    getAll: (params?: any) => baseService[getAllMethod](params),
    getById: (id: string) => baseService[getByIdMethod](id),
    create: (params: CreateParams) => baseService[createMethod](params),
    update: (id: string, params: UpdateParams) => baseService[updateMethod](id, params),
    delete: (id: string) => baseService[deleteMethod](id),
  };
}