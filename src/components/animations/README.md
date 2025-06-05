# Lottie Animation System

This directory contains the comprehensive Lottie animation system for the Token Nexus Platform. The system provides a unified approach to integrating smooth, professional animations throughout the application.

## Overview

The animation system is built with performance, accessibility, and maintainability in mind. It includes:

- **Base Components**: Core Lottie player and management utilities
- **Specialized Components**: Purpose-built components for different use cases
- **Performance Optimization**: Caching, preloading, and fallback systems
- **Accessibility**: Reduced motion support and proper ARIA labels

## Components

### Base Components

#### `LottiePlayer`
The core component that handles Lottie animation rendering with advanced features:

```tsx
import { LottiePlayer } from '@/components/animations';

<LottiePlayer
  animationData={animationData}
  loop={true}
  autoplay={true}
  speed={1}
  className="w-8 h-8"
  onComplete={() => console.log('Animation completed')}
  fallback={<div>Loading...</div>}
  priority="high"
/>
```

**Props:**
- `animationData`: Lottie animation JSON data
- `loop`: Whether to loop the animation
- `autoplay`: Start animation automatically
- `speed`: Animation playback speed
- `className`: CSS classes
- `onComplete`: Callback when animation completes
- `fallback`: Fallback component for errors/reduced motion
- `priority`: Loading priority ('high' | 'medium' | 'low')

### Loading Animations

#### `LoadingAnimation`
Versatile loading animation component with multiple types:

```tsx
import { LoadingAnimation, SpinnerLoading, DotsLoading } from '@/components/animations';

// Generic loading animation
<LoadingAnimation 
  type="spinner" 
  size="md" 
  showText={true} 
  text="Loading..." 
/>

// Specific loading components
<SpinnerLoading size="lg" />
<DotsLoading size="sm" showText={true} text="Processing..." />
```

**Available Types:**
- `spinner`: Rotating spinner animation
- `dots`: Bouncing dots animation
- `pulse`: Pulsing animation
- `skeleton`: Skeleton loading animation
- `progress`: Progress bar animation

**Sizes:** `sm` | `md` | `lg` | `xl`

### Feedback Animations

#### `FeedbackAnimation`
Success, error, and status feedback animations:

```tsx
import { SuccessAnimation, ErrorAnimation, WarningAnimation } from '@/components/animations';

<SuccessAnimation 
  size="lg" 
  message="Operation completed successfully!" 
  showMessage={true}
  onComplete={() => console.log('Success shown')}
/>

<ErrorAnimation 
  size="md" 
  message="Something went wrong" 
  showMessage={true}
/>
```

**Available Components:**
- `SuccessAnimation`: Success feedback
- `ErrorAnimation`: Error feedback
- `WarningAnimation`: Warning feedback
- `InfoAnimation`: Information feedback
- `CheckmarkAnimation`: Simple checkmark
- `CrossAnimation`: Simple cross/error mark

### Milestone Animations

#### `MilestoneAnimation`
Celebration animations for important achievements:

```tsx
import { TokenCreatedAnimation, WelcomeAnimation, AchievementAnimation } from '@/components/animations';

<TokenCreatedAnimation
  overlay={true}
  title="Token Created Successfully!"
  description="Your token has been deployed to the blockchain."
  onComplete={() => setShowAnimation(false)}
/>

<WelcomeAnimation
  size="xl"
  showText={true}
/>
```

**Available Components:**
- `TokenCreatedAnimation`: Token creation success
- `WelcomeAnimation`: Welcome/onboarding
- `AchievementAnimation`: General achievements
- `ConfettiAnimation`: Celebration with confetti
- `CelebrationAnimation`: General celebration

**Overlay Mode:**
Set `overlay={true}` to display as a full-screen overlay with backdrop.

### Enhanced UI Components

#### `AnimatedButton`
Button component with integrated Lottie animations:

```tsx
import { AnimatedButton } from '@/components/ui/animated-button';

<AnimatedButton
  loadingAnimation={true}
  successAnimation={true}
  hoverAnimation={true}
  loadingText="Creating..."
  successText="Created!"
  onClick={async () => {
    await createToken();
  }}
>
  Create Token
</AnimatedButton>
```

**Animation Types:**
- `loadingAnimation`: Shows loading animation during async operations
- `successAnimation`: Shows success animation after completion
- `hoverAnimation`: Subtle animation on hover
- `clickAnimation`: Animation on click

## Hooks

### `useLottieAnimation`
Hook for managing Lottie animations with advanced features:

```tsx
import { useLottieAnimation } from '@/hooks/useLottieAnimation';

const { animationData, state, load, play, pause, stop } = useLottieAnimation(
  '/animations/loading/spinner.json',
  {
    preload: true,
    priority: 'high',
    fallback: 'css'
  }
);
```

**Configuration Options:**
- `preload`: Load animation immediately
- `priority`: Loading priority
- `fallback`: Fallback strategy ('css' | 'static' | 'none')
- `loop`: Loop animation
- `autoplay`: Auto-start animation
- `speed`: Playback speed

## Animation Management

### `animationManager`
Centralized animation management with caching and preloading:

```tsx
import { animationManager } from '@/lib/animationManager';

// Get animation data
const animationData = await animationManager.getAnimation('/path/to/animation.json');

// Preload animation
animationManager.preload('/path/to/animation.json', 'high');

// Check cache status
const isLoaded = animationManager.isCached('/path/to/animation.json');
```

## Animation Assets

### Directory Structure
```
public/animations/
├── loading/          # Loading animations (<30KB)
├── feedback/         # Success/error animations (30-60KB)
├── interactive/      # Micro-interactions (<25KB)
├── milestones/       # Celebration animations (60-150KB)
└── transactions/     # Transaction status animations
```

### File Naming Convention
- Use kebab-case: `token-created.json`
- Include size indicator: `spinner-sm.json`, `celebration-lg.json`
- Version files: `success-v2.json`

## Performance Considerations

### Optimization Features
- **Lazy Loading**: Animations load only when needed
- **Caching**: Frequently used animations are cached
- **Preloading**: Critical animations preload in background
- **Bundle Splitting**: Animations don't block main bundle
- **Memory Management**: Automatic cleanup of unused animations

### Best Practices
1. **Use appropriate sizes**: Match animation complexity to usage frequency
2. **Implement fallbacks**: Always provide CSS/static fallbacks
3. **Respect reduced motion**: System automatically handles `prefers-reduced-motion`
4. **Monitor performance**: Use browser dev tools to check animation performance
5. **Optimize file sizes**: Compress animations without quality loss

## Accessibility

### Built-in Features
- **Reduced Motion Support**: Automatically respects user preferences
- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Doesn't interfere with keyboard access
- **Focus Management**: Maintains focus states during animations

### Implementation
```tsx
// Reduced motion is automatically handled
<LoadingAnimation type="spinner" reducedMotion={userPrefersReducedMotion} />

// Proper ARIA labeling
<LottiePlayer 
  animationData={data} 
  role="img" 
  aria-label="Loading animation"
/>
```

## Integration Examples

### Token Creation Form
```tsx
// Enhanced token form with animations
<AnimatedButton
  loadingAnimation={true}
  successAnimation={true}
  onClick={handleCreateToken}
>
  Create Token
</AnimatedButton>

{showSuccess && (
  <TokenCreatedAnimation
    overlay={true}
    title="Success!"
    description="Token deployed successfully"
  />
)}
```

### Dashboard Loading
```tsx
// Dashboard with skeleton loading
{isLoading ? (
  <LoadingAnimation type="skeleton" size="lg" />
) : (
  <DashboardContent />
)}
```

### Transaction Status
```tsx
// Real-time transaction updates
<div className="transaction-status">
  {status === 'pending' && <LoadingAnimation type="spinner" />}
  {status === 'confirmed' && <SuccessAnimation />}
  {status === 'failed' && <ErrorAnimation />}
</div>
```

## Troubleshooting

### Common Issues

1. **Animation not loading**
   - Check file path is correct
   - Verify animation JSON is valid
   - Check network requests in dev tools

2. **Performance issues**
   - Reduce animation complexity
   - Use appropriate priority settings
   - Check for memory leaks

3. **Accessibility concerns**
   - Test with screen readers
   - Verify reduced motion support
   - Check keyboard navigation

### Debug Mode
Enable debug logging:
```tsx
// Set in development environment
window.LOTTIE_DEBUG = true;
```

## Future Enhancements

- **Custom Animation Builder**: Tool for creating platform-specific animations
- **A/B Testing**: Framework for testing different animation variants
- **Analytics Integration**: Track animation performance and user engagement
- **Advanced Preloading**: ML-based prediction of needed animations
- **Theme Integration**: Animations that adapt to light/dark themes