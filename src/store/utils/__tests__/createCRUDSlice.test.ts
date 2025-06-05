import { configureStore } from '@reduxjs/toolkit';
import { createCRUDSlice, createApiServiceAdapter, CRUDApiService } from '../createCRUDSlice';

// Mock data types for testing
interface TestItem {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface CreateTestItemParams {
  name: string;
  status?: 'active' | 'inactive';
}

interface UpdateTestItemParams {
  name?: string;
  status?: 'active' | 'inactive';
}

// Mock API service
const createMockApiService = (): CRUDApiService<TestItem, CreateTestItemParams, UpdateTestItemParams> => ({
  getAll: jest.fn().mockResolvedValue({
    data: {
      items: [
        { id: '1', name: 'Test Item 1', status: 'active' },
        { id: '2', name: 'Test Item 2', status: 'inactive' },
      ],
      totalCount: 2,
      hasMore: false,
    },
  }),
  getById: jest.fn().mockResolvedValue({
    data: {
      item: { id: '1', name: 'Test Item 1', status: 'active' },
    },
  }),
  create: jest.fn().mockResolvedValue({
    data: {
      item: { id: '3', name: 'New Test Item', status: 'active' },
    },
  }),
  update: jest.fn().mockResolvedValue({
    data: {
      item: { id: '1', name: 'Updated Test Item', status: 'active' },
    },
  }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
});

describe('createCRUDSlice', () => {
  let mockApiService: CRUDApiService<TestItem, CreateTestItemParams, UpdateTestItemParams>;
  let store: any;
  let crudSlice: any;

  beforeEach(() => {
    mockApiService = createMockApiService();
    crudSlice = createCRUDSlice({
      name: 'testItems',
      apiService: mockApiService,
    });

    store = configureStore({
      reducer: {
        testItems: crudSlice.slice.reducer,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('slice creation', () => {
    it('should create a slice with correct name', () => {
      expect(crudSlice.slice.name).toBe('testItems');
    });

    it('should have initial state with correct structure', () => {
      const state = store.getState().testItems;
      expect(state).toEqual({
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
      });
    });

    it('should include standard actions', () => {
      expect(crudSlice.actions.clearError).toBeDefined();
      expect(crudSlice.actions.setFilters).toBeDefined();
      expect(crudSlice.actions.resetFilters).toBeDefined();
      expect(crudSlice.actions.clearSelectedItem).toBeDefined();
    });

    it('should include async thunk actions', () => {
      expect(crudSlice.actions.fetchItems).toBeDefined();
      expect(crudSlice.actions.fetchItemById).toBeDefined();
      expect(crudSlice.actions.createItem).toBeDefined();
      expect(crudSlice.actions.updateItem).toBeDefined();
      expect(crudSlice.actions.deleteItem).toBeDefined();
    });

    it('should include selectors', () => {
      expect(crudSlice.selectors.selectItems).toBeDefined();
      expect(crudSlice.selectors.selectSelectedItem).toBeDefined();
      expect(crudSlice.selectors.selectIsLoading).toBeDefined();
      expect(crudSlice.selectors.selectError).toBeDefined();
    });
  });

  describe('fetchItems thunk', () => {
    it('should handle fetchItems.pending', () => {
      store.dispatch(crudSlice.actions.fetchItems.pending('', undefined));
      const state = store.getState().testItems;
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle fetchItems.fulfilled', async () => {
      await store.dispatch(crudSlice.actions.fetchItems());
      const state = store.getState().testItems;
      
      expect(state.isLoading).toBe(false);
      expect(state.items).toHaveLength(2);
      expect(state.items[0]).toEqual({ id: '1', name: 'Test Item 1', status: 'active' });
      expect(state.totalCount).toBe(2);
      expect(state.hasMore).toBe(false);
      expect(mockApiService.getAll).toHaveBeenCalledWith(undefined);
    });

    it('should handle fetchItems.rejected', () => {
      const error = new Error('Network error');
      store.dispatch(crudSlice.actions.fetchItems.rejected(error, '', undefined));
      const state = store.getState().testItems;
      
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should pass parameters to API service', async () => {
      const params = { status: 'active', limit: 10 };
      await store.dispatch(crudSlice.actions.fetchItems(params));
      expect(mockApiService.getAll).toHaveBeenCalledWith(params);
    });
  });

  describe('fetchItemById thunk', () => {
    it('should handle fetchItemById.fulfilled', async () => {
      await store.dispatch(crudSlice.actions.fetchItemById('1'));
      const state = store.getState().testItems;
      
      expect(state.isLoading).toBe(false);
      expect(state.selectedItem).toEqual({ id: '1', name: 'Test Item 1', status: 'active' });
      expect(mockApiService.getById).toHaveBeenCalledWith('1');
    });

    it('should clear selectedItem on pending', () => {
      store.dispatch(crudSlice.actions.fetchItemById.pending('', '1'));
      const state = store.getState().testItems;
      expect(state.selectedItem).toBe(null);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('createItem thunk', () => {
    it('should handle createItem.fulfilled', async () => {
      const createParams = { name: 'New Test Item', status: 'active' as const };
      await store.dispatch(crudSlice.actions.createItem(createParams));
      const state = store.getState().testItems;
      
      expect(state.isCreating).toBe(false);
      expect(state.items[0]).toEqual({ id: '3', name: 'New Test Item', status: 'active' });
      expect(mockApiService.create).toHaveBeenCalledWith(createParams);
    });

    it('should handle createItem.pending', () => {
      store.dispatch(crudSlice.actions.createItem.pending('', { name: 'Test' }));
      const state = store.getState().testItems;
      expect(state.isCreating).toBe(true);
      expect(state.error).toBe(null);
    });
  });

  describe('updateItem thunk', () => {
    it('should handle updateItem.fulfilled', async () => {
      // First add an item to update
      await store.dispatch(crudSlice.actions.fetchItems());
      
      const updateParams = { id: '1', params: { name: 'Updated Test Item' } };
      await store.dispatch(crudSlice.actions.updateItem(updateParams));
      const state = store.getState().testItems;
      
      expect(state.isUpdating).toBe(false);
      expect(state.items[0].name).toBe('Updated Test Item');
      expect(mockApiService.update).toHaveBeenCalledWith('1', { name: 'Updated Test Item' });
    });

    it('should update selectedItem if it matches', async () => {
      // Set selected item
      await store.dispatch(crudSlice.actions.fetchItemById('1'));
      
      const updateParams = { id: '1', params: { name: 'Updated Test Item' } };
      await store.dispatch(crudSlice.actions.updateItem(updateParams));
      const state = store.getState().testItems;
      
      expect(state.selectedItem?.name).toBe('Updated Test Item');
    });
  });

  describe('deleteItem thunk', () => {
    it('should handle deleteItem.fulfilled', async () => {
      // First add items
      await store.dispatch(crudSlice.actions.fetchItems());
      
      await store.dispatch(crudSlice.actions.deleteItem('1'));
      const state = store.getState().testItems;
      
      expect(state.isDeleting).toBe(false);
      expect(state.items.find(item => item.id === '1')).toBeUndefined();
      expect(mockApiService.delete).toHaveBeenCalledWith('1');
    });

    it('should clear selectedItem if it matches deleted item', async () => {
      // Set selected item
      await store.dispatch(crudSlice.actions.fetchItemById('1'));
      
      await store.dispatch(crudSlice.actions.deleteItem('1'));
      const state = store.getState().testItems;
      
      expect(state.selectedItem).toBe(null);
    });
  });

  describe('synchronous actions', () => {
    it('should handle clearError action', () => {
      // Set an error first
      store.dispatch(crudSlice.actions.fetchItems.rejected(new Error('Test error'), '', undefined));
      expect(store.getState().testItems.error).toBe('Test error');
      
      // Clear the error
      store.dispatch(crudSlice.actions.clearError());
      expect(store.getState().testItems.error).toBe(null);
    });

    it('should handle setFilters action', () => {
      const filters = { status: 'active', name: 'test' };
      store.dispatch(crudSlice.actions.setFilters(filters));
      const state = store.getState().testItems;
      expect(state.filters).toEqual(filters);
    });

    it('should handle resetFilters action', () => {
      // Set filters first
      store.dispatch(crudSlice.actions.setFilters({ status: 'active' }));
      expect(store.getState().testItems.filters).toEqual({ status: 'active' });
      
      // Reset filters
      store.dispatch(crudSlice.actions.resetFilters());
      expect(store.getState().testItems.filters).toEqual({});
    });

    it('should handle clearSelectedItem action', () => {
      // Set selected item first
      store.dispatch(crudSlice.actions.fetchItemById.fulfilled(
        { id: '1', name: 'Test', status: 'active' },
        '',
        '1'
      ));
      expect(store.getState().testItems.selectedItem).toBeTruthy();
      
      // Clear selected item
      store.dispatch(crudSlice.actions.clearSelectedItem());
      expect(store.getState().testItems.selectedItem).toBe(null);
    });
  });

  describe('selectors', () => {
    beforeEach(async () => {
      await store.dispatch(crudSlice.actions.fetchItems());
    });

    it('should select items correctly', () => {
      const items = crudSlice.selectors.selectItems(store.getState());
      expect(items).toHaveLength(2);
    });

    it('should select loading state correctly', () => {
      store.dispatch(crudSlice.actions.fetchItems.pending('', undefined));
      const isLoading = crudSlice.selectors.selectIsLoading(store.getState());
      expect(isLoading).toBe(true);
    });

    it('should select error correctly', () => {
      store.dispatch(crudSlice.actions.fetchItems.rejected(new Error('Test error'), '', undefined));
      const error = crudSlice.selectors.selectError(store.getState());
      expect(error).toBe('Test error');
    });
  });

  describe('custom configuration', () => {
    it('should use custom initial state', () => {
      const customSlice = createCRUDSlice({
        name: 'customItems',
        apiService: mockApiService,
        initialState: {
          filters: { defaultFilter: 'value' },
          totalCount: 100,
        },
      });

      const customStore = configureStore({
        reducer: {
          customItems: customSlice.slice.reducer,
        },
      });

      const state = customStore.getState().customItems;
      expect(state.filters).toEqual({ defaultFilter: 'value' });
      expect(state.totalCount).toBe(100);
    });

    it('should use custom error messages', async () => {
      const customSlice = createCRUDSlice({
        name: 'customItems',
        apiService: {
          ...mockApiService,
          getAll: jest.fn().mockRejectedValue(new Error()),
        },
        errorMessages: {
          fetch: 'Custom fetch error message',
        },
      });

      const customStore = configureStore({
        reducer: {
          customItems: customSlice.slice.reducer,
        },
      });

      await customStore.dispatch(customSlice.actions.fetchItems({}));
      const state = customStore.getState().customItems;
      expect(state.error).toBe('Custom fetch error message');
    });

    it('should use custom response mapping', async () => {
      const customApiService = {
        ...mockApiService,
        getAll: jest.fn().mockResolvedValue({
          data: {
            results: [{ id: '1', name: 'Test', status: 'active' }],
            count: 1,
            more: false,
          },
        }),
      };

      const customSlice = createCRUDSlice({
        name: 'customItems',
        apiService: customApiService,
        responseMapping: {
          items: 'results',
          totalCount: 'count',
          hasMore: 'more',
        },
      });

      const customStore = configureStore({
        reducer: {
          customItems: customSlice.slice.reducer,
        },
      });

      await customStore.dispatch(customSlice.actions.fetchItems({}));
      const state = customStore.getState().customItems;
      expect(state.items).toHaveLength(1);
      expect(state.totalCount).toBe(1);
      expect(state.hasMore).toBe(false);
    });
  });
});

describe('createApiServiceAdapter', () => {
  it('should create adapter with default method names', () => {
    const baseService = {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const adapter = createApiServiceAdapter(baseService);
    
    adapter.getAll();
    adapter.getById('1');
    adapter.create({ name: 'test' });
    adapter.update('1', { name: 'updated' });
    adapter.delete('1');

    expect(baseService.getAll).toHaveBeenCalled();
    expect(baseService.getById).toHaveBeenCalledWith('1');
    expect(baseService.create).toHaveBeenCalledWith({ name: 'test' });
    expect(baseService.update).toHaveBeenCalledWith('1', { name: 'updated' });
    expect(baseService.delete).toHaveBeenCalledWith('1');
  });

  it('should create adapter with custom method names', () => {
    const baseService = {
      fetchAll: jest.fn(),
      fetchOne: jest.fn(),
      createNew: jest.fn(),
      updateExisting: jest.fn(),
      remove: jest.fn(),
    };

    const adapter = createApiServiceAdapter(baseService, {
      getAllMethod: 'fetchAll',
      getByIdMethod: 'fetchOne',
      createMethod: 'createNew',
      updateMethod: 'updateExisting',
      deleteMethod: 'remove',
    });
    
    adapter.getAll();
    adapter.getById('1');
    adapter.create({ name: 'test' });
    adapter.update('1', { name: 'updated' });
    adapter.delete('1');

    expect(baseService.fetchAll).toHaveBeenCalled();
    expect(baseService.fetchOne).toHaveBeenCalledWith('1');
    expect(baseService.createNew).toHaveBeenCalledWith({ name: 'test' });
    expect(baseService.updateExisting).toHaveBeenCalledWith('1', { name: 'updated' });
    expect(baseService.remove).toHaveBeenCalledWith('1');
  });
});