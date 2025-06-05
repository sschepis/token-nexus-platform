# Token Nexus Platform - Theming System

A comprehensive theming system that allows organizations to customize their admin dashboard and end-user pages with full branding control.

## 🎨 Features

- **Complete Theme Customization**: Colors, typography, components, layout, and branding
- **Pre-built Templates**: Corporate, Modern, and Minimal themes ready to use
- **Real-time Preview**: See changes instantly before applying them
- **Accessibility Compliance**: Built-in WCAG accessibility checking
- **Performance Optimized**: CSS variable generation, caching, and optimization
- **Theme Inheritance**: Platform defaults → Templates → Organization overrides
- **React Integration**: Context providers and hooks for seamless integration
- **Redux State Management**: Centralized theme state with undo/redo support

## 🚀 Quick Start

### 1. Setup Theme Provider

Wrap your application with the `ThemeProvider`:

```tsx
import { ThemeProvider } from '@/theming';

function App() {
  return (
    <ThemeProvider 
      enableCaching={true}
      enableValidation={true}
      fallbackTheme={platformDefaults}
    >
      <YourApp />
    </ThemeProvider>
  );
}
```

### 2. Add Theme Management

Include the theme management interface in your admin panel:

```tsx
import { ThemeManagement } from '@/theming';

function AdminPanel({ organizationId }: { organizationId: string }) {
  return (
    <div>
      <h1>Organization Settings</h1>
      <ThemeManagement organizationId={organizationId} />
    </div>
  );
}
```

### 3. Use Theme in Components

Access theme values in your components:

```tsx
import { useTheme, useThemeColors } from '@/theming';

function MyComponent() {
  const { currentTheme } = useTheme();
  const colors = useThemeColors();
  
  return (
    <div style={{ 
      backgroundColor: colors?.primary,
      color: colors?.text.primary 
    }}>
      Welcome to {currentTheme?.name}
    </div>
  );
}
```

## 📁 Architecture

```
src/theming/
├── types/                    # TypeScript type definitions
│   └── theme.types.ts       # Core theme interfaces
├── engine/                   # Core theming engine
│   ├── ThemeEngine.ts       # Main theme resolution engine
│   ├── ThemeResolver.ts     # Theme inheritance logic
│   └── CSSVariableGenerator.ts # CSS variable generation
├── utils/                    # Utility functions
│   ├── themeValidation.ts   # Theme validation and accessibility
│   └── cssGeneration.ts     # CSS generation utilities
├── providers/                # React Context providers
│   └── ThemeContext.tsx     # Theme context and hooks
├── templates/                # Pre-built theme templates
│   ├── corporate.ts         # Corporate theme
│   ├── modern.ts           # Modern theme
│   ├── minimal.ts          # Minimal theme
│   └── index.ts            # Template utilities
├── components/               # React components
│   ├── ThemeEditor/         # Theme editing interface
│   ├── ThemeTemplateGallery/ # Template selection
│   ├── ThemeManagement/     # Main management interface
│   └── index.ts            # Component exports
└── index.ts                 # Main exports
```

## 🎯 Core Concepts

### Theme Structure

A theme consists of several key areas:

```typescript
interface OrganizationTheme {
  // Metadata
  id: string;
  name: string;
  version: string;
  organizationId?: string;
  
  // Visual properties
  colors: ThemeColors;           // Color palette
  typography: ThemeTypography;   // Fonts and text styles
  spacing: ThemeSpacing;         // Spacing scale
  borderRadius: BorderRadius;    // Border radius values
  shadows: Shadows;             // Shadow definitions
  
  // Layout and components
  layout: LayoutProperties;      // Layout dimensions
  components: ComponentThemes;   // Component-specific styling
  animations: AnimationConfig;   // Animation settings
  
  // Branding
  branding: BrandingAssets;     // Logos and assets
  customProperties?: Record<string, string>; // Custom CSS properties
  customCSS?: string;           // Custom CSS
}
```

### Theme Inheritance

Themes follow a three-tier inheritance model:

1. **Platform Defaults**: Base theme with sensible defaults
2. **Template Theme**: Optional template (Corporate, Modern, Minimal)
3. **Organization Overrides**: Custom organization-specific changes

```
Platform Defaults → Template → Organization = Final Theme
```

### CSS Variable Generation

The system automatically generates CSS variables for all theme properties:

```css
:root {
  --theme-primary: #3b82f6;
  --theme-secondary: #64748b;
  --theme-text-primary: #1e293b;
  --theme-spacing-md: 1rem;
  /* ... hundreds more variables */
}
```

## 🛠️ API Reference

### Theme Context Hooks

#### `useTheme()`
Main hook for theme operations:

```tsx
const {
  currentTheme,        // Current active theme
  isLoading,          // Loading state
  error,              // Error state
  setTheme,           // Apply a new theme
  updateTheme,        // Update current theme
  resetTheme,         // Reset to defaults
  validateTheme,      // Validate theme
  generateCSS,        // Generate CSS from theme
  previewTheme,       // Preview theme temporarily
  applyTheme          // Apply theme permanently
} = useTheme();
```

#### `useThemeColors()`
Access theme colors:

```tsx
const colors = useThemeColors();
// colors.primary, colors.secondary, colors.text.primary, etc.
```

#### `useThemeVariables()`
Get CSS variables map:

```tsx
const variables = useThemeVariables();
// { '--theme-primary': '#3b82f6', ... }
```

### Redux Actions

#### Theme Management
```tsx
import { useDispatch } from 'react-redux';
import { 
  loadOrganizationTheme,
  saveOrganizationTheme,
  applyThemeTemplate,
  updateCurrentTheme
} from '@/theming';

const dispatch = useDispatch();

// Load organization theme
dispatch(loadOrganizationTheme('org-123'));

// Apply template
dispatch(applyThemeTemplate({ 
  templateId: 'corporate-template',
  organizationId: 'org-123' 
}));

// Update theme
dispatch(updateCurrentTheme({
  colors: { primary: '#ff0000' }
}));
```

### Theme Validation

```tsx
import { ThemeValidator } from '@/theming';

const result = ThemeValidator.validateTheme(theme);

if (!result.isValid) {
  console.log('Errors:', result.errors);
  console.log('Warnings:', result.warnings);
  console.log('Accessibility Score:', result.accessibilityScore);
}
```

### CSS Generation

```tsx
import { CSSGenerator } from '@/theming';

// Generate complete CSS
const css = CSSGenerator.generateThemeCSS(theme);

// Generate only variables
const variables = CSSGenerator.generateCSSVariables(theme);

// Minify CSS
const minified = CSSGenerator.minifyCSS(css);
```

## 🎨 Theme Templates

### Corporate Theme
Professional, conservative design suitable for enterprise organizations:
- Navy blue and gray color scheme
- Conservative border radius
- Professional typography
- Subtle shadows and effects

### Modern Theme
Contemporary, vibrant design for tech companies and startups:
- Purple and teal color scheme
- Gradient effects and glass morphism
- Modern typography
- Enhanced animations

### Minimal Theme
Clean, simple design with plenty of whitespace:
- Subtle gray color scheme
- Minimal shadows and effects
- Clean typography
- Understated aesthetics

## 🔧 Customization

### Creating Custom Themes

```tsx
import { OrganizationTheme } from '@/theming';

const customTheme: Partial<OrganizationTheme> = {
  colors: {
    primary: '#your-brand-color',
    secondary: '#your-secondary-color',
    // ... other colors
  },
  typography: {
    fontFamily: 'Your Custom Font, sans-serif',
    // ... other typography
  },
  // ... other theme properties
};

// Apply custom theme
const { updateTheme } = useTheme();
updateTheme(customTheme);
```

### Component-Level Theming

```tsx
const componentTheme = {
  components: {
    button: {
      variants: {
        primary: {
          backgroundColor: 'var(--theme-primary)',
          color: 'white',
          borderRadius: '8px'
        }
      }
    }
  }
};
```

### Custom CSS Properties

```tsx
const themeWithCustomProps = {
  customProperties: {
    'brand-gradient': 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
    'brand-shadow': '0 4px 20px rgba(0,0,0,0.1)'
  }
};
```

## 🎯 Best Practices

### 1. Accessibility First
- Always check contrast ratios (aim for WCAG AA: 4.5:1)
- Test with screen readers
- Ensure sufficient color differentiation

### 2. Performance
- Use CSS variables for dynamic theming
- Enable caching for production
- Minimize custom CSS

### 3. Consistency
- Follow the spacing scale
- Use theme colors consistently
- Maintain visual hierarchy

### 4. Testing
- Test themes across different screen sizes
- Validate themes before applying
- Preview changes before saving

## 🐛 Troubleshooting

### Common Issues

**Theme not applying:**
- Check if ThemeProvider is wrapping your app
- Verify organizationId is correct
- Check browser console for errors

**CSS variables not working:**
- Ensure modern browser support
- Check if CSS is properly injected
- Verify variable names are correct

**Performance issues:**
- Enable caching in production
- Minimize custom CSS
- Use CSS variables instead of inline styles

### Debug Mode

Enable debug mode to see detailed theme information:

```tsx
import { ThemeDebugInfo } from '@/theming';

// Add to your app in development
{process.env.NODE_ENV === 'development' && <ThemeDebugInfo />}
```

## 📚 Examples

See the `/examples` directory for complete implementation examples:
- Basic theme setup
- Custom theme creation
- Template customization
- Advanced theming patterns

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure accessibility compliance

## 📄 License

This theming system is part of the Token Nexus Platform and follows the same licensing terms.