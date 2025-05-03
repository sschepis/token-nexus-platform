
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { CloudFunction, CloudFunctionState } from '@/types/cloud-functions';

const initialState: CloudFunctionState = {
  functions: [
    {
      id: uuidv4(),
      name: "getUser",
      description: "Gets user data by ID",
      code: "export default function getUser(req, res) {\n  const { userId } = req.params;\n  // In a real app, this would fetch from a database\n  return { id: userId, name: 'Sample User', email: 'user@example.com' };\n}",
      language: "javascript",
      runtime: "nodejs18.x",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "processPayment",
      description: "Processes a payment transaction",
      code: "export default async function processPayment(req, res) {\n  const { amount, currency } = req.body;\n  // This would integrate with a payment provider in a real app\n  return { success: true, transactionId: 'tx_' + Math.random().toString(36).substr(2, 9) };\n}",
      language: "javascript",
      runtime: "nodejs18.x",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  selectedFunctionId: null,
  isLoading: false,
  error: null
};

export const cloudFunctionSlice = createSlice({
  name: 'cloudFunction',
  initialState,
  reducers: {
    addFunction: (state, action: PayloadAction<Omit<CloudFunction, 'id' | 'createdAt' | 'updatedAt' | 'status'>>) => {
      const newFunction: CloudFunction = {
        ...action.payload,
        id: uuidv4(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.functions.push(newFunction);
    },
    
    updateFunction: (state, action: PayloadAction<{ id: string, updates: Partial<CloudFunction> }>) => {
      const { id, updates } = action.payload;
      const functionIndex = state.functions.findIndex(func => func.id === id);
      
      if (functionIndex >= 0) {
        state.functions[functionIndex] = {
          ...state.functions[functionIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
    },
    
    deleteFunction: (state, action: PayloadAction<string>) => {
      const functionId = action.payload;
      state.functions = state.functions.filter(func => func.id !== functionId);
      
      if (state.selectedFunctionId === functionId) {
        state.selectedFunctionId = null;
      }
    },
    
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
  },
});

export const { 
  addFunction, 
  updateFunction, 
  deleteFunction, 
  setSelectedFunction,
  bindFunctionToRoute,
  unbindFunctionFromRoute
} = cloudFunctionSlice.actions;

export default cloudFunctionSlice.reducer;
