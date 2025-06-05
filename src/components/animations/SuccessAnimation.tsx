import React from 'react';
import { LottiePlayer } from './LottiePlayer';
import { useLottieAnimation } from '@/hooks/useLottieAnimation';
import { ANIMATION_PATHS, ANIMATION_CONFIGS, FALLBACK_ANIMATIONS } from '@/lib/animationConstants';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export type FeedbackAnimationType = 'success' | 'error' | 'warning' | 'info' | 'checkmark' | 'cross';

interface FeedbackAnimationProps {
  type?: FeedbackAnimationType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
  showMessage?: boolean;
  autoplay?: boolean;
  onComplete?: () => void;
}

const FEEDBACK_PATHS = {
  success: ANIMATION_PATHS.FEEDBACK.SUCCESS,
  error: ANIMATION_PATHS.FEEDBACK.ERROR,
  warning: ANIMATION_PATHS.FEEDBACK.WARNING,
  info: ANIMATION_PATHS.FEEDBACK.INFO,
  checkmark: ANIMATION_PATHS.FEEDBACK.CHECKMARK,
  cross: ANIMATION_PATHS.FEEDBACK.CROSS,
};

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const TEXT_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

const FALLBACK_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  checkmark: CheckCircle,
  cross: XCircle,
};

const COLOR_CLASSES = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
  checkmark: 'text-green-500',
  cross: 'text-red-500',
};

export const FeedbackAnimation: React.FC<FeedbackAnimationProps> = ({
  type = 'success',
  size = 'md',
  className,
  message,
  showMessage = false,
  autoplay = true,
  onComplete,
}) => {
  const animationPath = FEEDBACK_PATHS[type];
  const { animationData, state, load } = useLottieAnimation(animationPath, {
    ...ANIMATION_CONFIGS.FEEDBACK,
    autoplay,
  });

  // Load animation on mount
  React.useEffect(() => {
    load();
  }, [load]);

  // Fallback component for reduced motion or errors
  const FallbackIcon = FALLBACK_ICONS[type];
  const FallbackComponent = () => (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <FallbackIcon className={cn(
        SIZE_CLASSES[size],
        COLOR_CLASSES[type],
        FALLBACK_ANIMATIONS.SUCCESS
      )} />
      {showMessage && message && (
        <p className={cn(
          'mt-2 text-center',
          TEXT_SIZE_CLASSES[size],
          COLOR_CLASSES[type]
        )}>
          {message}
        </p>
      )}
    </div>
  );

  // Show fallback while loading or on error
  if (!state.isLoaded || state.hasError || !animationData) {
    return <FallbackComponent />;
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <LottiePlayer
        animationData={animationData}
        loop={ANIMATION_CONFIGS.FEEDBACK.loop}
        autoplay={autoplay}
        speed={ANIMATION_CONFIGS.FEEDBACK.speed}
        className={SIZE_CLASSES[size]}
        priority={ANIMATION_CONFIGS.FEEDBACK.priority}
        onComplete={onComplete}
        fallback={<FallbackComponent />}
      />
      {showMessage && message && (
        <p className={cn(
          'mt-2 text-center',
          TEXT_SIZE_CLASSES[size],
          COLOR_CLASSES[type]
        )}>
          {message}
        </p>
      )}
    </div>
  );
};

// Specific feedback components for common use cases
export const SuccessAnimation: React.FC<Omit<FeedbackAnimationProps, 'type'>> = (props) => (
  <FeedbackAnimation {...props} type="success" />
);

export const ErrorAnimation: React.FC<Omit<FeedbackAnimationProps, 'type'>> = (props) => (
  <FeedbackAnimation {...props} type="error" />
);

export const WarningAnimation: React.FC<Omit<FeedbackAnimationProps, 'type'>> = (props) => (
  <FeedbackAnimation {...props} type="warning" />
);

export const InfoAnimation: React.FC<Omit<FeedbackAnimationProps, 'type'>> = (props) => (
  <FeedbackAnimation {...props} type="info" />
);

export const CheckmarkAnimation: React.FC<Omit<FeedbackAnimationProps, 'type'>> = (props) => (
  <FeedbackAnimation {...props} type="checkmark" />
);

export const CrossAnimation: React.FC<Omit<FeedbackAnimationProps, 'type'>> = (props) => (
  <FeedbackAnimation {...props} type="cross" />
);

export default FeedbackAnimation;