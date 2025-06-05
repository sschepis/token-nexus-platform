# Token Nexus Platform - Coding Conventions

This document establishes standardized coding conventions for the Token Nexus Platform to ensure consistency, maintainability, and optimal LLM code generation quality.

## Table of Contents

1. [File Naming Conventions](#file-naming-conventions)
2. [Directory Structure](#directory-structure)
3. [Import/Export Patterns](#importexport-patterns)
4. [TypeScript Conventions](#typescript-conventions)
5. [React Component Conventions](#react-component-conventions)
6. [State Management](#state-management)
7. [Error Handling](#error-handling)
8. [API Service Patterns](#api-service-patterns)
9. [Styling Conventions](#styling-conventions)
10. [Documentation Standards](#documentation-standards)

## File Naming Conventions

### React Components
- **Format**: `PascalCase.tsx`
- **Examples**: `AppLayout.tsx`, `TokenStatsWidget.tsx`, `UserDetailView.tsx`

### Services and Utilities
- **Format**: `camelCase.ts`
- **Examples**: `appInitService.ts`, `objectManagerService.ts`, `evmUtils.ts`

### Hooks
- **Format**: `use + PascalCase.ts`
- **Examples**: `useStore.ts`, `useCurrentOrganization.ts`, `usePageController.ts`

### Redux Slices
- **Format**: `camelCase + Slice.ts`
- **Examples**: `orgSlice.ts`, `authSlice.ts`, `tokenSlice.ts`

### Types and Interfaces
- **Format**: `camelCase.d.ts` for type definition files
- **Examples**: `app-framework.d.ts`, `object-manager.d.ts`

### API Routes
- **Format**: `kebab-case.ts`
- **Examples**: `app-status.ts`, `bootstrap-login.ts`, `complete-initial-setup.ts`

## Directory Structure

### Standard Directory Organization
```
src/
├── components/           # React components (feature-based)
│   ├── layout/          # Layout components
│   ├── dashboard/       # Dashboard-specific components
│   ├── ui/              # Reusable UI components
│   └── [feature]/       # Feature-specific components
├── pages/               # Next.js pages
├── services/            # Business logic and API services
│   └── api/             # API service modules
├── store/               # Redux store and slices
│   └── slices/          # Redux slices
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── lib/                 # Utility libraries
├── theming/             # Theme-related code
└── controllers/         # Page controllers and actions
```

### Component Directory Structure
```
components/
├── [feature]/
│   ├── [ComponentName].tsx     # Main component
│   ├── [ComponentName].test.tsx # Tests (if applicable)
│   └── index.ts                # Re-export (if needed)
```

## Import/Export Patterns

### Import Order (Standardized)
```typescript
// 1. External libraries (React, Next.js, etc.)
import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";

// 2. Internal utilities and services (absolute paths with @/)
import { useAppSelector } from "@/store/hooks";
import { apiService } from "@/services/api";
import { Organization } from "@/types/organization";

// 3. Relative imports (components in same directory)
import Navbar from "./Navbar";
import { AppSidebar } from "./AppSidebar";
```

### Export Patterns
- **React Components**: Always use default export
- **Utilities/Services**: Use named exports
- **Types/Interfaces**: Use named exports
- **Constants**: Use named exports

```typescript
// ✅ Correct - React Component
export default AppLayout;

// ✅ Correct - Utilities
export const mockResponse = (data: any) => { ... };
export const validateTheme = (theme: Theme) => { ... };

// ✅ Correct - Types
export interface Organization { ... }
export type UserRole = 'admin' | 'user';
```

### Path Aliases (Required)
- **Always use `@/` for absolute imports**
- **Never use relative imports for cross-directory access**

```typescript
// ✅ Correct
import { useAppSelector } from "@/store/hooks";
import { Organization } from "@/types/organization";

// ❌ Incorrect
import { useAppSelector } from "../../store/hooks";
import { Organization } from "../../../types/organization";
```

## TypeScript Conventions

### Interface Naming
- **Component Props**: `ComponentName + Props`
- **API Responses**: `ComponentName + Response`
- **Form Data**: `ComponentName + FormData`
- **Configuration**: `ComponentName + Config`

```typescript
// ✅ Correct
interface AppLayoutProps {
  children: ReactNode;
}

interface UserDetailResponse {
  user: User;
  permissions: Permission[];
}

interface CreateUserFormData {
  name: string;
  email: string;
}
```

### Type Definitions
- **Use interfaces for object shapes**
- **Use type aliases for unions, primitives, and computed types**
- **Always export types from dedicated files when shared**

```typescript
// ✅ Correct - Interface for object shape
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Correct - Type alias for union
type UserRole = 'admin' | 'user' | 'viewer';

// ✅ Correct - Type alias for computed type
type UserWithRole = User & { role: UserRole };
```

### Generic Constraints
```typescript
// ✅ Correct - Descriptive generic names
interface ApiResponse<TData = unknown> {
  data: TData;
  success: boolean;
  message?: string;
}

// ✅ Correct - Constrained generics
interface Repository<TEntity extends { id: string }> {
  findById(id: string): Promise<TEntity>;
  save(entity: TEntity): Promise<TEntity>;
}
```

## React Component Conventions

### Component Structure (Required Template)
```typescript
import React from 'react';
// Other imports...

interface ComponentNameProps {
  // Props definition
}

const ComponentName: React.FC<ComponentNameProps> = ({ 
  prop1, 
  prop2,
  ...otherProps 
}) => {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState(initialValue);
  
  // 2. Event handlers
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependencies]);
  
  // 3. Computed values
  const computedValue = useMemo(() => {
    return expensiveComputation(state);
  }, [state]);
  
  // 4. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 5. Early returns (loading, error states)
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  // 6. Main render
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
```

### Props Destructuring
- **Always destructure props in function signature**
- **Use rest operator for pass-through props**

```typescript
// ✅ Correct
const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary',
  disabled = false,
  ...htmlProps 
}) => {
  return (
    <button 
      className={`btn btn-${variant}`}
      disabled={disabled}
      {...htmlProps}
    >
      {children}
    </button>
  );
};
```

## State Management

### Redux Toolkit Patterns (Required)

#### Slice Structure
```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// 1. Types
interface EntityState {
  items: Entity[];
  currentItem: Entity | null;
  isLoading: boolean;
  error: string | null;
}

// 2. Initial state
const initialState: EntityState = {
  items: [],
  currentItem: null,
  isLoading: false,
  error: null,
};

// 3. Async thunks
export const fetchEntities = createAsyncThunk(
  'entity/fetchEntities',
  async (params: FetchParams, { rejectWithValue }) => {
    try {
      const response = await apiService.getEntities(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch entities');
    }
  }
);

// 4. Slice
export const entitySlice = createSlice({
  name: 'entity',
  initialState,
  reducers: {
    // Synchronous reducers
    clearError: (state) => {
      state.error = null;
    },
    setCurrentItem: (state, action: PayloadAction<Entity | null>) => {
      state.currentItem = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntities.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEntities.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchEntities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentItem } = entitySlice.actions;
export default entitySlice.reducer;
```

### Zustand Patterns (For Local/Component State)
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface StoreState {
  // State properties
  items: Item[];
  selectedItem: Item | null;
  
  // Actions
  setItems: (items: Item[]) => void;
  selectItem: (item: Item | null) => void;
  addItem: (item: Item) => void;
}

export const useStore = create<StoreState>()(
  devtools(
    (set, get) => ({
      items: [],
      selectedItem: null,
      
      setItems: (items) => set({ items }),
      selectItem: (selectedItem) => set({ selectedItem }),
      addItem: (item) => set((state) => ({ 
        items: [...state.items, item] 
      })),
    }),
    { name: 'store-name' }
  )
);
```

## Error Handling

### Standardized Error Handling Pattern
```typescript
// API Services
export const apiFunction = async (params: Params): Promise<Response> => {
  try {
    const result = await Parse.Cloud.run('functionName', params);
    
    // Success notification (optional, based on context)
    toast.success('Operation completed successfully');
    
    return result;
  } catch (error: any) {
    // Log error for debugging
    console.error('API Error:', error);
    
    // User-friendly error notification
    toast.error(error.message || 'An unexpected error occurred');
    
    // Re-throw for caller to handle
    throw error;
  }
};

// Redux Async Thunks
export const asyncThunk = createAsyncThunk(
  'slice/action',
  async (params: Params, { rejectWithValue }) => {
    try {
      const result = await apiService.someFunction(params);
      return result;
    } catch (error: any) {
      // Toast is handled in API service
      return rejectWithValue(error.message || 'Operation failed');
    }
  }
);
```

### Error Boundaries (Required for Page Components)
```typescript
// Use React Error Boundary for page-level error handling
import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="error-container">
    <h2>Something went wrong</h2>
    <pre>{error.message}</pre>
    <button onClick={resetErrorBoundary}>Try again</button>
  </div>
);

// Wrap page components
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <PageComponent />
</ErrorBoundary>
```

## API Service Patterns

### Service Structure (Required)
```typescript
// services/api/entityService.ts
import Parse from 'parse';
import { apiService, mockResponse } from './base';

export interface EntityApiService {
  getEntities(params?: GetEntitiesParams): Promise<ApiResponse<Entity[]>>;
  getEntity(id: string): Promise<ApiResponse<Entity>>;
  createEntity(data: CreateEntityData): Promise<ApiResponse<Entity>>;
  updateEntity(id: string, data: UpdateEntityData): Promise<ApiResponse<Entity>>;
  deleteEntity(id: string): Promise<ApiResponse<void>>;
}

export const entityApi: EntityApiService = {
  async getEntities(params = {}) {
    try {
      const result = await Parse.Cloud.run('getEntities', params);
      return { data: result, success: true };
    } catch (error: any) {
      console.error('Failed to fetch entities:', error);
      toast.error(error.message || 'Failed to fetch entities');
      throw error;
    }
  },
  
  // ... other methods
};

// Mock implementations for development
export const mockEntityApi: EntityApiService = {
  getEntities: (params) => mockResponse({ entities: mockEntities }),
  // ... other mock methods
};

// Export based on environment
export const entityService = process.env.NODE_ENV === 'development' 
  ? mockEntityApi 
  : entityApi;
```

### API Response Types (Standardized)
```typescript
interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```

## Styling Conventions

### Tailwind CSS (Primary Approach)
- **Use Tailwind utility classes**
- **Create component variants using CSS variables**
- **Use `clsx` for conditional classes**

```typescript
import { clsx } from 'clsx';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className,
  ...props 
}) => {
  return (
    <button
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        
        // Size variants
        {
          'px-3 py-2 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        
        // Color variants
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'danger',
        },
        
        // State variants
        {
          'opacity-50 cursor-not-allowed': disabled,
        },
        
        // Additional classes
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
};
```

### CSS Custom Properties (For Theming)
```css
:root {
  --color-primary: 220 14% 96%;
  --color-primary-foreground: 220 9% 46%;
  --color-secondary: 220 14% 96%;
  --color-secondary-foreground: 220 9% 46%;
}
```

## Documentation Standards

### JSDoc Comments (Required for Public APIs)
```typescript
/**
 * Fetches user details by ID with organization context
 * 
 * @param userId - The unique identifier for the user
 * @param options - Additional fetch options
 * @param options.includePermissions - Whether to include user permissions
 * @param options.includeOrganizations - Whether to include user organizations
 * @returns Promise resolving to user details
 * 
 * @example
 * ```typescript
 * const user = await getUserDetails('user123', { 
 *   includePermissions: true 
 * });
 * ```
 * 
 * @throws {ApiError} When user is not found or access is denied
 */
export async function getUserDetails(
  userId: string,
  options: GetUserDetailsOptions = {}
): Promise<UserDetails> {
  // Implementation
}
```

### README Files (Required for Major Features)
```markdown
# Feature Name

Brief description of the feature and its purpose.

## Usage

```typescript
import { FeatureComponent } from '@/components/feature';

<FeatureComponent 
  prop1="value1"
  prop2={value2}
/>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | - | Description of prop1 |
| prop2 | number | 0 | Description of prop2 |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| onChange | (value: string) => void | Fired when value changes |
```

### Inline Comments
```typescript
// Use single-line comments for brief explanations
const result = processData(input); // Process the input data

/* 
 * Use block comments for longer explanations
 * that span multiple lines and provide context
 * about complex logic or business rules
 */
const complexCalculation = (data: ComplexData) => {
  // Implementation
};
```

## Enforcement

### ESLint Configuration
These conventions should be enforced through ESLint rules:

```json
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "interface",
        "format": ["PascalCase"],
        "custom": {
          "regex": "^I[A-Z]|Props$|Config$|Response$|Data$",
          "match": true
        }
      }
    ],
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "pathGroups": [
          {
            "pattern": "@/**",
            "group": "internal",
            "position": "before"
          }
        ]
      }
    ]
  }
}
```

### Pre-commit Hooks
Use Husky and lint-staged to enforce conventions:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

**Note**: These conventions are designed to optimize code quality for both human developers and LLM code generation. Consistency in these patterns will significantly improve AI-assisted development workflows.