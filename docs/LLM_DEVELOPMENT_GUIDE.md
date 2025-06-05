# LLM Development Guide for Token Nexus Platform

This guide provides specific instructions for AI/LLM-assisted development on the Token Nexus Platform, ensuring optimal code generation quality and consistency.

## Quick Reference for LLMs

### File Creation Patterns

When creating new files, always follow these patterns:

#### React Components
```typescript
// src/components/[feature]/ComponentName.tsx
import React from 'react';

import { useAppSelector } from '@/store/hooks';
import { SomeType } from '@/types/feature';

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
}

const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 = 0 }) => {
  // 1. Hooks
  const stateValue = useAppSelector((state) => state.feature.value);
  
  // 2. Event handlers
  const handleClick = () => {
    // Handler logic
  };
  
  // 3. Early returns
  if (!stateValue) return null;
  
  // 4. Main render
  return (
    <div className="component-container">
      <h1>{prop1}</h1>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};

export default ComponentName;
```

#### Services
```typescript
// src/services/featureService.ts
import Parse from 'parse';

import { ApiResponse, FeatureData } from '@/types/feature';

export interface FeatureService {
  getFeatures(): Promise<ApiResponse<FeatureData[]>>;
  createFeature(data: CreateFeatureData): Promise<ApiResponse<FeatureData>>;
}

export const featureService: FeatureService = {
  async getFeatures() {
    try {
      const result = await Parse.Cloud.run('getFeatures');
      return { data: result, success: true };
    } catch (error: any) {
      console.error('Failed to fetch features:', error);
      throw error;
    }
  },

  async createFeature(data) {
    try {
      const result = await Parse.Cloud.run('createFeature', data);
      return { data: result, success: true };
    } catch (error: any) {
      console.error('Failed to create feature:', error);
      throw error;
    }
  },
};
```

#### Redux Slices
```typescript
// src/store/slices/featureSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

import { featureService } from '@/services/featureService';

interface FeatureState {
  items: Feature[];
  currentItem: Feature | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: FeatureState = {
  items: [],
  currentItem: null,
  isLoading: false,
  error: null,
};

export const fetchFeatures = createAsyncThunk(
  'feature/fetchFeatures',
  async (_, { rejectWithValue }) => {
    try {
      const response = await featureService.getFeatures();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch features');
    }
  }
);

export const featureSlice = createSlice({
  name: 'feature',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentItem: (state, action: PayloadAction<Feature | null>) => {
      state.currentItem = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatures.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFeatures.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchFeatures.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setCurrentItem } = featureSlice.actions;
export default featureSlice.reducer;
```

#### Custom Hooks
```typescript
// src/hooks/useFeature.ts
import { useCallback } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFeatures, clearError } from '@/store/slices/featureSlice';

export const useFeature = () => {
  const dispatch = useAppDispatch();
  const { items, currentItem, isLoading, error } = useAppSelector(
    (state) => state.feature
  );

  const loadFeatures = useCallback(() => {
    dispatch(fetchFeatures());
  }, [dispatch]);

  const clearFeatureError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    features: items,
    currentFeature: currentItem,
    isLoading,
    error,
    loadFeatures,
    clearError: clearFeatureError,
  };
};
```

### Import Path Rules

**ALWAYS use these import patterns:**

```typescript
// ✅ External libraries first
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';

// ✅ Internal imports with @/ prefix
import { useAppSelector } from '@/store/hooks';
import { FeatureService } from '@/services/featureService';
import { Feature } from '@/types/feature';

// ✅ Relative imports only for same directory
import { FeatureCard } from './FeatureCard';
import { FeatureModal } from './FeatureModal';
```

**NEVER use these patterns:**
```typescript
// ❌ Never use relative imports for cross-directory access
import { useAppSelector } from '../../store/hooks';
import { Feature } from '../../../types/feature';
```

### Component Prop Patterns

**Always destructure props in function signature:**
```typescript
// ✅ Correct
const Component: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 = defaultValue,
  ...otherProps 
}) => {
  return <div {...otherProps}>{prop1}</div>;
};

// ❌ Incorrect
const Component: React.FC<ComponentProps> = (props) => {
  return <div>{props.prop1}</div>;
};
```

### State Management Patterns

**For global state (Redux):**
```typescript
// Use for: user auth, organization data, app-wide settings
const { user, isAuthenticated } = useAppSelector((state) => state.auth);
const dispatch = useAppDispatch();
```

**For local component state:**
```typescript
// Use for: form inputs, UI toggles, temporary data
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState(initialFormData);
```

**For complex local state (Zustand):**
```typescript
// Use for: dashboard layouts, page builder state, complex UI state
const { items, addItem, removeItem } = useFeatureStore();
```

### Error Handling Patterns

**API Services:**
```typescript
export const apiFunction = async (params: Params) => {
  try {
    const result = await Parse.Cloud.run('functionName', params);
    toast.success('Operation completed successfully');
    return result;
  } catch (error: any) {
    console.error('API Error:', error);
    toast.error(error.message || 'An unexpected error occurred');
    throw error;
  }
};
```

**React Components:**
```typescript
const Component = () => {
  const [error, setError] = useState<string | null>(null);
  
  const handleAction = async () => {
    try {
      setError(null);
      await someAsyncOperation();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  if (error) {
    return <ErrorMessage message={error} onRetry={handleAction} />;
  }
  
  return <div>Content</div>;
};
```

### Styling Patterns

**Use Tailwind with clsx for conditional styles:**
```typescript
import { clsx } from 'clsx';

const Button = ({ variant, size, disabled, className, ...props }) => (
  <button
    className={clsx(
      // Base styles
      'inline-flex items-center justify-center rounded-md font-medium',
      
      // Size variants
      {
        'px-3 py-2 text-sm': size === 'sm',
        'px-4 py-2 text-base': size === 'md',
        'px-6 py-3 text-lg': size === 'lg',
      },
      
      // Color variants
      {
        'bg-primary text-primary-foreground': variant === 'primary',
        'bg-secondary text-secondary-foreground': variant === 'secondary',
      },
      
      // State
      { 'opacity-50 cursor-not-allowed': disabled },
      
      // Additional classes
      className
    )}
    disabled={disabled}
    {...props}
  />
);
```

## LLM-Specific Instructions

### When Creating New Features

1. **Always start with types/interfaces**
2. **Create the service layer next**
3. **Build Redux slice if needed**
4. **Create custom hooks**
5. **Build UI components last**

### File Naming Checklist

- [ ] React components: `PascalCase.tsx`
- [ ] Services: `camelCase.ts`
- [ ] Hooks: `use + PascalCase.ts`
- [ ] Types: `camelCase.d.ts`
- [ ] Redux slices: `camelCase + Slice.ts`

### Import Checklist

- [ ] External libraries first
- [ ] Internal imports with `@/` prefix
- [ ] Relative imports only for same directory
- [ ] Proper grouping with blank lines

### Component Checklist

- [ ] Props interface defined
- [ ] Props destructured in function signature
- [ ] Hooks at the top
- [ ] Event handlers next
- [ ] Early returns for loading/error states
- [ ] Main render last
- [ ] Default export

### Redux Checklist

- [ ] State interface defined
- [ ] Initial state object
- [ ] Async thunks with proper error handling
- [ ] Slice with reducers and extraReducers
- [ ] Proper action exports

## Common Patterns Reference

### Loading States
```typescript
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
```

### Form Handling
```typescript
const [formData, setFormData] = useState(initialData);
const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await submitForm(formData);
    toast.success('Form submitted successfully');
  } catch (error: any) {
    setErrors(error.fieldErrors || {});
    toast.error(error.message);
  }
};
```

### Modal Patterns
```typescript
const [isOpen, setIsOpen] = useState(false);

const openModal = () => setIsOpen(true);
const closeModal = () => setIsOpen(false);

return (
  <>
    <button onClick={openModal}>Open Modal</button>
    <Modal isOpen={isOpen} onClose={closeModal}>
      <ModalContent />
    </Modal>
  </>
);
```

### List Rendering
```typescript
const renderItems = () => {
  if (items.length === 0) {
    return <EmptyState message="No items found" />;
  }
  
  return items.map((item) => (
    <ItemCard 
      key={item.id} 
      item={item} 
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  ));
};
```

## Performance Considerations

### Use React.memo for expensive components
```typescript
const ExpensiveComponent = React.memo<ComponentProps>(({ data }) => {
  return <ComplexVisualization data={data} />;
});
```

### Use useCallback for event handlers
```typescript
const handleClick = useCallback((id: string) => {
  dispatch(selectItem(id));
}, [dispatch]);
```

### Use useMemo for expensive calculations
```typescript
const expensiveValue = useMemo(() => {
  return performExpensiveCalculation(data);
}, [data]);
```

## Testing Patterns

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';

import { store } from '@/store/store';
import Component from './Component';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('Component', () => {
  it('renders correctly', () => {
    renderWithProvider(<Component prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

---

**Remember**: These patterns are optimized for both human readability and LLM code generation. Following them consistently will result in higher quality AI-assisted development.