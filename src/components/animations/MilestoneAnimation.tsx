import React from 'react';
import { LottiePlayer } from './LottiePlayer';
import { useLottieAnimation } from '@/hooks/useLottieAnimation';
import { ANIMATION_PATHS, ANIMATION_CONFIGS } from '@/lib/animationConstants';
import { cn } from '@/lib/utils';
import { Trophy, Star, Gift, Sparkles, PartyPopper } from 'lucide-react';

export type MilestoneAnimationType = 'token_created' | 'welcome' | 'achievement' | 'confetti' | 'celebration';

interface MilestoneAnimationProps {
  type?: MilestoneAnimationType;
  size?: 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  title?: string;
  description?: string;
  showText?: boolean;
  autoplay?: boolean;
  onComplete?: () => void;
  overlay?: boolean;
}

const MILESTONE_PATHS = {
  token_created: ANIMATION_PATHS.MILESTONES.TOKEN_CREATED,
  welcome: ANIMATION_PATHS.MILESTONES.WELCOME,
  achievement: ANIMATION_PATHS.MILESTONES.ACHIEVEMENT,
  confetti: ANIMATION_PATHS.MILESTONES.CONFETTI,
  celebration: ANIMATION_PATHS.MILESTONES.CELEBRATION,
};

const SIZE_CLASSES = {
  md: 'w-32 h-32',
  lg: 'w-48 h-48',
  xl: 'w-64 h-64',
  full: 'w-full h-full max-w-md max-h-md',
};

const FALLBACK_ICONS = {
  token_created: Trophy,
  welcome: Star,
  achievement: Trophy,
  confetti: PartyPopper,
  celebration: Sparkles,
};

const DEFAULT_MESSAGES = {
  token_created: {
    title: 'Token Created Successfully!',
    description: 'Your token has been deployed to the blockchain.',
  },
  welcome: {
    title: 'Welcome to Token Nexus!',
    description: 'Let\'s get started with your blockchain journey.',
  },
  achievement: {
    title: 'Achievement Unlocked!',
    description: 'You\'ve reached a new milestone.',
  },
  confetti: {
    title: 'Congratulations!',
    description: 'You\'ve completed an important task.',
  },
  celebration: {
    title: 'Success!',
    description: 'Your action was completed successfully.',
  },
};

export const MilestoneAnimation: React.FC<MilestoneAnimationProps> = ({
  type = 'celebration',
  size = 'lg',
  className,
  title,
  description,
  showText = true,
  autoplay = true,
  onComplete,
  overlay = false,
}) => {
  const animationPath = MILESTONE_PATHS[type];
  const { animationData, state, load } = useLottieAnimation(animationPath, {
    ...ANIMATION_CONFIGS.MILESTONES,
    autoplay,
  });

  const defaultMessage = DEFAULT_MESSAGES[type];
  const displayTitle = title || defaultMessage.title;
  const displayDescription = description || defaultMessage.description;

  // Load animation on mount
  React.useEffect(() => {
    load();
  }, [load]);

  // Fallback component for reduced motion or errors
  const FallbackIcon = FALLBACK_ICONS[type];
  const FallbackComponent = () => (
    <div className={cn(
      'flex flex-col items-center justify-center p-6',
      overlay && 'fixed inset-0 bg-black/50 z-50',
      className
    )}>
      <div className={cn(
        'flex flex-col items-center justify-center bg-background rounded-lg p-8',
        overlay && 'shadow-lg border'
      )}>
        <FallbackIcon className={cn(
          'text-primary mb-4',
          size === 'md' ? 'w-16 h-16' : size === 'lg' ? 'w-24 h-24' : 'w-32 h-32'
        )} />
        {showText && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {displayTitle}
            </h3>
            <p className="text-sm text-muted-foreground">
              {displayDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Show fallback while loading or on error
  if (!state.isLoaded || state.hasError || !animationData) {
    return <FallbackComponent />;
  }

  const AnimationContent = () => (
    <div className="flex flex-col items-center justify-center">
      <LottiePlayer
        animationData={animationData}
        loop={ANIMATION_CONFIGS.MILESTONES.loop}
        autoplay={autoplay}
        speed={ANIMATION_CONFIGS.MILESTONES.speed}
        className={SIZE_CLASSES[size]}
        priority={ANIMATION_CONFIGS.MILESTONES.priority}
        onComplete={onComplete}
        fallback={<FallbackComponent />}
      />
      {showText && (
        <div className="text-center mt-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {displayTitle}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {displayDescription}
          </p>
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className={cn(
        'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
        className
      )}>
        <div className="bg-background rounded-lg p-8 shadow-lg border max-w-md mx-4">
          <AnimationContent />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <AnimationContent />
    </div>
  );
};

// Specific milestone components for common use cases
export const TokenCreatedAnimation: React.FC<Omit<MilestoneAnimationProps, 'type'>> = (props) => (
  <MilestoneAnimation {...props} type="token_created" />
);

export const WelcomeAnimation: React.FC<Omit<MilestoneAnimationProps, 'type'>> = (props) => (
  <MilestoneAnimation {...props} type="welcome" />
);

export const AchievementAnimation: React.FC<Omit<MilestoneAnimationProps, 'type'>> = (props) => (
  <MilestoneAnimation {...props} type="achievement" />
);

export const ConfettiAnimation: React.FC<Omit<MilestoneAnimationProps, 'type'>> = (props) => (
  <MilestoneAnimation {...props} type="confetti" />
);

export const CelebrationAnimation: React.FC<Omit<MilestoneAnimationProps, 'type'>> = (props) => (
  <MilestoneAnimation {...props} type="celebration" />
);

export default MilestoneAnimation;