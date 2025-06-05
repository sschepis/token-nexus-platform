import React, { useState } from 'react';
import { Button, ButtonProps } from './button';
import { LottiePlayer } from '../animations/LottiePlayer';
import { useLottieAnimation } from '@/hooks/useLottieAnimation';
import { ANIMATION_PATHS, ANIMATION_CONFIGS } from '@/lib/animationConstants';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AnimatedButtonProps extends ButtonProps {
  loadingAnimation?: boolean;
  hoverAnimation?: boolean;
  clickAnimation?: boolean;
  successAnimation?: boolean;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
  onAnimationComplete?: () => void;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  className,
  disabled,
  loadingAnimation = true,
  hoverAnimation = false,
  clickAnimation = false,
  successAnimation = false,
  loadingText = 'Loading...',
  successText = 'Success!',
  successDuration = 2000,
  onAnimationComplete,
  onClick,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Animation hooks
  const { animationData: hoverAnimationData, load: loadHover } = useLottieAnimation(
    ANIMATION_PATHS.INTERACTIVE.BUTTON_HOVER,
    { ...ANIMATION_CONFIGS.INTERACTIVE, autoplay: false }
  );

  const { animationData: clickAnimationData, load: loadClick } = useLottieAnimation(
    ANIMATION_PATHS.INTERACTIVE.BUTTON_CLICK,
    { ...ANIMATION_CONFIGS.INTERACTIVE, autoplay: false }
  );

  const { animationData: successAnimationData, load: loadSuccess } = useLottieAnimation(
    ANIMATION_PATHS.FEEDBACK.SUCCESS,
    { ...ANIMATION_CONFIGS.FEEDBACK, autoplay: false }
  );

  // Load animations on mount if needed
  React.useEffect(() => {
    if (hoverAnimation) loadHover();
    if (clickAnimation) loadClick();
    if (successAnimation) loadSuccess();
  }, [hoverAnimation, clickAnimation, successAnimation, loadHover, loadClick, loadSuccess]);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || showSuccess) return;

    // Show click animation if enabled
    if (clickAnimation && clickAnimationData) {
      // Trigger click animation
    }

    if (onClick) {
      setIsLoading(true);
      
      try {
        await onClick(event);
        
        // Show success animation if enabled
        if (successAnimation) {
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            onAnimationComplete?.();
          }, successDuration);
        }
      } catch (error) {
        console.error('Button action failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Determine button content
  const getButtonContent = () => {
    if (showSuccess && successAnimation) {
      return (
        <div className="flex items-center justify-center">
          {successAnimationData ? (
            <LottiePlayer
              animationData={successAnimationData}
              autoplay={true}
              loop={false}
              className="w-4 h-4 mr-2"
              priority="high"
              fallback={<Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            />
          ) : (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          {successText}
        </div>
      );
    }

    if (isLoading && loadingAnimation) {
      return (
        <div className="flex items-center justify-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center">
        {hoverAnimation && isHovered && hoverAnimationData && (
          <LottiePlayer
            animationData={hoverAnimationData}
            autoplay={true}
            loop={true}
            className="w-4 h-4 mr-2"
            priority="medium"
          />
        )}
        {children}
      </div>
    );
  };

  return (
    <Button
      {...props}
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        hoverAnimation && 'hover:scale-105',
        className
      )}
      disabled={disabled || isLoading || showSuccess}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {getButtonContent()}
    </Button>
  );
};

// Preset animated button variants
export const LoadingButton: React.FC<Omit<AnimatedButtonProps, 'loadingAnimation'>> = (props) => (
  <AnimatedButton {...props} loadingAnimation={true} />
);

export const HoverButton: React.FC<Omit<AnimatedButtonProps, 'hoverAnimation'>> = (props) => (
  <AnimatedButton {...props} hoverAnimation={true} />
);

export const ClickButton: React.FC<Omit<AnimatedButtonProps, 'clickAnimation'>> = (props) => (
  <AnimatedButton {...props} clickAnimation={true} />
);

export const SuccessButton: React.FC<Omit<AnimatedButtonProps, 'successAnimation'>> = (props) => (
  <AnimatedButton {...props} successAnimation={true} />
);

export const FullyAnimatedButton: React.FC<AnimatedButtonProps> = (props) => (
  <AnimatedButton
    {...props}
    loadingAnimation={true}
    hoverAnimation={true}
    clickAnimation={true}
    successAnimation={true}
  />
);

export default AnimatedButton;