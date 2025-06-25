# Page Builder Controller Refactoring

This directory contains the refactored Page Builder controller, which was previously a single large file (`PageBuilderPageController.ts`) that has been broken down into smaller, more manageable modules.

## Structure

### Core Files

- **`PageBuilderBaseController.ts`** - Abstract base class containing shared configuration, metadata, and helper methods
- **`PageBuilderPageController.ts`** - Main controller class that orchestrates all functionality
- **`index.ts`** - Module exports

### Actions Directory (`actions/`)

The actions are organized by functional responsibility:

- **`PageActions.ts`** - CRUD operations for pages
  - `fetchPages` - Get all custom pages with filtering
  - `createPage` - Create new custom pages
  - `updatePage` - Update existing pages
  - `deletePage` - Delete pages with confirmation

- **`PreviewActions.ts`** - Page preview functionality
  - `previewPage` - Generate page previews in different view modes

- **`SecurityActions.ts`** - Security-related operations
  - `generateToken` - Generate access tokens for pages

- **`index.ts`** - Exports all action modules

## Benefits of Refactoring

1. **Separation of Concerns** - Each file has a single, well-defined responsibility
2. **Maintainability** - Easier to locate and modify specific functionality
3. **Testability** - Individual action modules can be tested in isolation
4. **Reusability** - Action modules can be reused in other controllers if needed
5. **Readability** - Smaller files are easier to understand and navigate

## Backward Compatibility

The original `src/controllers/PageBuilderPageController.ts` file has been updated to re-export from the new structure, ensuring that existing imports continue to work without modification.

## Usage

```typescript
// Import the controller (same as before)
import { pageBuilderPageController } from '@/controllers/PageBuilderPageController';

// Or import from the new structure
import { pageBuilderPageController } from '@/controllers/pageBuilder';

// Import specific action modules if needed
import { PageActions, PreviewActions, SecurityActions } from '@/controllers/pageBuilder/actions';
```

## File Size Reduction

- **Original file**: 455 lines
- **New structure**: 
  - Base controller: 58 lines
  - Page actions: 264 lines
  - Preview actions: 72 lines
  - Security actions: 58 lines
  - Main controller: 26 lines
  - **Total functional code**: ~478 lines (distributed across multiple focused files)

The slight increase in total lines is due to better documentation, clearer separation, and elimination of code duplication through the base class.