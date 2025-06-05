import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LottiePlayerProps {
  animationData: object;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  onLoopComplete?: () => void;
  fallback?: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
  reducedMotion?: boolean;
}

export const LottiePlayer: React.FC<LottiePlayerProps> = ({
  animationData,
  loop = false,
  autoplay = true,
  speed = 1,
  className,
  onComplete,
  onLoopComplete,
  fallback,
  priority = 'medium',
  reducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lottie, setLottie] = useState<any>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  const shouldAnimate = !prefersReducedMotion && !reducedMotion;

  useEffect(() => {
    let isMounted = true;

    const loadLottie = async () => {
      try {
        // Dynamic import to reduce bundle size
        const lottieModule = await import('lottie-react');
        
        if (isMounted) {
          setLottie(lottieModule.default);
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load Lottie:', error);
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    // Load based on priority
    if (priority === 'high') {
      loadLottie();
    } else {
      // Delay loading for lower priority animations
      const delay = priority === 'medium' ? 100 : 500;
      const timer = setTimeout(loadLottie, delay);
      return () => clearTimeout(timer);
    }

    return () => {
      isMounted = false;
    };
  }, [priority]);

  useEffect(() => {
    if (!lottie || !containerRef.current || !shouldAnimate) return;

    try {
      const animation = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop,
        autoplay,
        animationData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
          progressiveLoad: true,
        },
      });

      animation.setSpeed(speed);
      animationRef.current = animation;

      // Event listeners
      if (onComplete) {
        animation.addEventListener('complete', onComplete);
      }

      if (onLoopComplete) {
        animation.addEventListener('loopComplete', onLoopComplete);
      }

      return () => {
        animation.destroy();
      };
    } catch (error) {
      console.error('Failed to initialize Lottie animation:', error);
      setHasError(true);
    }
  }, [lottie, animationData, loop, autoplay, speed, onComplete, onLoopComplete, shouldAnimate]);

  // Pause animation when tab is not visible (performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!animationRef.current) return;

      if (document.hidden) {
        animationRef.current.pause();
      } else {
        animationRef.current.play();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Show fallback for reduced motion or errors
  if (!shouldAnimate || hasError) {
    return fallback ? (
      <div className={cn('flex items-center justify-center', className)}>
        {fallback}
      </div>
    ) : null;
  }

  // Show loading state
  if (!isLoaded || !lottie) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="animate-pulse w-8 h-8 bg-muted rounded-full" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('lottie-container', className)}
      role="img"
      aria-label="Animation"
    />
  );
};

export default LottiePlayer;