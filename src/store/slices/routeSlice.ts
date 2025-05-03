
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { Route, RouteHandler, HttpMethod } from '@/types/routes';

interface RouteState {
  routes: Route[];
  selectedRouteId: string | null;
}

const initialState: RouteState = {
  routes: [
    {
      id: uuidv4(),
      path: "/dashboard",
      methods: {
        "GET": {
          id: uuidv4(),
          type: "page",
          target: "Dashboard",
          description: "Main dashboard page"
        }
      },
      active: true,
      protected: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      path: "/users",
      methods: {
        "GET": {
          id: uuidv4(),
          type: "page",
          target: "Users",
          description: "User management page"
        }
      },
      active: true,
      protected: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  selectedRouteId: null
};

export const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    addRoute: (state, action: PayloadAction<{ path: string; method: HttpMethod; handler: Omit<RouteHandler, 'id'>; protected?: boolean }>) => {
      const { path, method, handler, protected: isProtected = true } = action.payload;
      const existingRouteIndex = state.routes.findIndex(route => route.path === path);
      
      if (existingRouteIndex >= 0) {
        // Add method to existing route
        state.routes[existingRouteIndex].methods[method] = {
          ...handler,
          id: uuidv4()
        };
        state.routes[existingRouteIndex].updatedAt = new Date().toISOString();
      } else {
        // Create new route
        const newRoute: Route = {
          id: uuidv4(),
          path,
          methods: {
            [method]: {
              ...handler,
              id: uuidv4()
            }
          },
          active: true,
          protected: isProtected,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        state.routes.push(newRoute);
      }
    },
    
    updateRoute: (state, action: PayloadAction<{ routeId: string; updates: Partial<Route> }>) => {
      const { routeId, updates } = action.payload;
      const routeIndex = state.routes.findIndex(route => route.id === routeId);
      
      if (routeIndex >= 0) {
        state.routes[routeIndex] = {
          ...state.routes[routeIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
    },
    
    deleteRoute: (state, action: PayloadAction<string>) => {
      const routeId = action.payload;
      state.routes = state.routes.filter(route => route.id !== routeId);
      
      if (state.selectedRouteId === routeId) {
        state.selectedRouteId = null;
      }
    },
    
    updateRouteMethod: (state, action: PayloadAction<{ 
      routeId: string; 
      method: HttpMethod; 
      handler: Partial<RouteHandler> 
    }>) => {
      const { routeId, method, handler } = action.payload;
      const routeIndex = state.routes.findIndex(route => route.id === routeId);
      
      if (routeIndex >= 0) {
        if (state.routes[routeIndex].methods[method]) {
          state.routes[routeIndex].methods[method] = {
            ...state.routes[routeIndex].methods[method]!,
            ...handler
          };
        } else {
          state.routes[routeIndex].methods[method] = {
            id: uuidv4(),
            type: "page",
            target: "",
            ...handler
          };
        }
        state.routes[routeIndex].updatedAt = new Date().toISOString();
      }
    },
    
    deleteRouteMethod: (state, action: PayloadAction<{ routeId: string; method: HttpMethod }>) => {
      const { routeId, method } = action.payload;
      const routeIndex = state.routes.findIndex(route => route.id === routeId);
      
      if (routeIndex >= 0 && state.routes[routeIndex].methods[method]) {
        delete state.routes[routeIndex].methods[method];
        state.routes[routeIndex].updatedAt = new Date().toISOString();
      }
    },
    
    setSelectedRoute: (state, action: PayloadAction<string | null>) => {
      state.selectedRouteId = action.payload;
    },
  },
});

export const { 
  addRoute, 
  updateRoute, 
  deleteRoute, 
  updateRouteMethod, 
  deleteRouteMethod, 
  setSelectedRoute 
} = routeSlice.actions;

export default routeSlice.reducer;
