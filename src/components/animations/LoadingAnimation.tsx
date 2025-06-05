import React from 'react';
import { LottiePlayer } from './LottiePlayer';
import { useLottieAnimation } from '@/hooks/useLottieAnimation';
import { ANIMATION_PATHS, ANIMATION_CONFIGS, FALLBACK_ANIMATIONS } from '@/lib/animationConstants';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type LoadingAnimationType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';

interface LoadingAnimationProps {
  type?: LoadingAnimationType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  showText?: boolean;
  color?: 'primary' | 'secondary' | 'muted';
}

const LOADING_PATHS = {
  spinner: ANIMATION_PATHS.LOADING.SPINNER,
  dots: ANIMATION_PATHS.LOADING.DOTS,
  pulse: ANIMATION_PATHS.LOADING.PULSE,
  skeleton: ANIMATION_PATHS.LOADING.SKELETON,
  progress: ANIMATION_PATHS.LOADING.PROGRESS,
};

const SIZE_CLASSES = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const TEXT_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

const COLOR_CLASSES = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted-foreground',
};

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'spinner',
  size = 'md',
  className,
  text = 'Loading...',
  showText = false,
  color = 'primary',
}) => {
  const animationPath = LOADING_PATHS[type];
  const { animationData, state, load } = useLottieAnimation(animationPath, {
    ...ANIMATION_CONFIGS.LOADING,
    preload: true,
  });

  // Load animation on mount
  React.useEffect(() => {
    load();
  }, [load]);

  // Fallback component for reduced motion or errors
  const FallbackComponent = () => (
    <div className={cn('flex items-center justify-center', className)}>
      <Loader2 className={cn(
        SIZE_CLASSES[size],
        COLOR_CLASSES[color],
        FALLBACK_ANIMATIONS.LOADING
      )} />
      {showText && (
        <span className={cn(
          'ml-2',
          TEXT_SIZE_CLASSES[size],
          COLOR_CLASSES[color]
        )}>
          {text}
        </span>
      )}
    </div>
  );

  // Show fallback while loading or on error
  if (!state.isLoaded || state.hasError || !animationData) {
    return <FallbackComponent />;
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <LottiePlayer
        animationData={animationData}
        loop={ANIMATION_CONFIGS.LOADING.loop}
        autoplay={ANIMATION_CONFIGS.LOADING.autoplay}
        speed={ANIMATION_CONFIGS.LOADING.speed}
        className={SIZE_CLASSES[size]}
        priority={ANIMATION_CONFIGS.LOADING.priority}
        fallback={<FallbackComponent />}
      />
      {showText && (
        <span className={cn(
          'ml-2',
          TEXT_SIZE_CLASSES[size],
          COLOR_CLASSES[color]
        )}>
          {text}
        </span>
      )}
    </div>
  );
};

// Specific loading components for common use cases
export const SpinnerLoading: React.FC<Omit<LoadingAnimationProps, 'type'>> = (props) => (
  <LoadingAnimation {...props} type="spinner" />
);

export const DotsLoading: React.FC<Omit<LoadingAnimationProps, 'type'>> = (props) => (
  <LoadingAnimation {...props} type="dots" />
);

export const PulseLoading: React.FC<Omit<LoadingAnimationProps, 'type'>> = (props) => (
  <LoadingAnimation {...props} type="pulse" />
);

export const SkeletonLoading: React.FC<Omit<LoadingAnimationProps, 'type'>> = (props) => (
  <LoadingAnimation {...props} type="skeleton" />
);

export const ProgressLoading: React.FC<Omit<LoadingAnimationProps, 'type'>> = (props) => (
  <LoadingAnimation {...props} type="progress" />
);

export default LoadingAnimation;