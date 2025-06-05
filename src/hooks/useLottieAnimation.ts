import { useState, useEffect, useCallback } from 'react';

export interface AnimationConfig {
  preload?: boolean;
  fallback?: 'css' | 'static' | 'none';
  priority?: 'high' | 'medium' | 'low';
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  reducedMotion?: boolean;
}

export interface AnimationState {
  isLoaded: boolean;
  isPlaying: boolean;
  hasError: boolean;
  progress: number;
}

export const useLottieAnimation = (
  animationPath: string,
  config: AnimationConfig = {}
) => {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [state, setState] = useState<AnimationState>({
    isLoaded: false,
    isPlaying: false,
    hasError: false,
    progress: 0,
  });

  const {
    preload = false,
    priority = 'medium',
    fallback = 'css',
  } = config;

  // Load animation data
  const loadAnimation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, hasError: false }));
      
      // Dynamic import based on priority
      const loadDelay = priority === 'high' ? 0 : priority === 'medium' ? 100 : 500;
      
      if (loadDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, loadDelay));
      }

      const response = await fetch(animationPath);
      if (!response.ok) {
        throw new Error(`Failed to load animation: ${response.statusText}`);
      }

      const data = await response.json();
      setAnimationData(data);
      setState(prev => ({ ...prev, isLoaded: true }));
    } catch (error) {
      console.error('Failed to load Lottie animation:', error);
      setState(prev => ({ ...prev, hasError: true }));
    }
  }, [animationPath, priority]);

  // Preload animation if configured
  useEffect(() => {
    if (preload) {
      loadAnimation();
    }
  }, [preload, loadAnimation]);

  // Load animation on demand
  const load = useCallback(() => {
    if (!animationData && !state.hasError) {
      loadAnimation();
    }
  }, [animationData, state.hasError, loadAnimation]);

  // Animation control methods
  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false, progress: 0 }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress: Math.max(0, Math.min(1, progress)) }));
  }, []);

  return {
    animationData,
    state,
    load,
    play,
    pause,
    stop,
    setProgress,
    config,
  };
};

export default useLottieAnimation;