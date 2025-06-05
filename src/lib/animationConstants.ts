export const ANIMATION_PATHS = {
  // Loading animations (lightweight: <30KB)
  LOADING: {
    SPINNER: '/animations/loading/spinner.json',
    DOTS: '/animations/loading/dots.json',
    PULSE: '/animations/loading/pulse.json',
    SKELETON: '/animations/loading/skeleton.json',
    PROGRESS: '/animations/loading/progress.json',
  },
  
  // Success/Error feedback (medium: 30-60KB)
  FEEDBACK: {
    SUCCESS: '/animations/feedback/success.json',
    ERROR: '/animations/feedback/error.json',
    WARNING: '/animations/feedback/warning.json',
    INFO: '/animations/feedback/info.json',
    CHECKMARK: '/animations/feedback/checkmark.json',
    CROSS: '/animations/feedback/cross.json',
  },
  
  // Interactive elements (lightweight: <25KB)
  INTERACTIVE: {
    BUTTON_HOVER: '/animations/interactive/button-hover.json',
    BUTTON_CLICK: '/animations/interactive/button-click.json',
    MENU_EXPAND: '/animations/interactive/menu-expand.json',
    TAB_SWITCH: '/animations/interactive/tab-switch.json',
    CARD_HOVER: '/animations/interactive/card-hover.json',
  },
  
  // Milestone celebrations (complex: 60-150KB)
  MILESTONES: {
    TOKEN_CREATED: '/animations/milestones/token-created.json',
    WELCOME: '/animations/milestones/welcome.json',
    ACHIEVEMENT: '/animations/milestones/achievement.json',
    CONFETTI: '/animations/milestones/confetti.json',
    CELEBRATION: '/animations/milestones/celebration.json',
  },
  
  // Transaction states
  TRANSACTIONS: {
    PENDING: '/animations/transactions/pending.json',
    CONFIRMING: '/animations/transactions/confirming.json',
    CONFIRMED: '/animations/transactions/confirmed.json',
    FAILED: '/animations/transactions/failed.json',
  },
} as const;

export const ANIMATION_CONFIGS = {
  // Default configurations for different animation types
  LOADING: {
    loop: true,
    autoplay: true,
    speed: 1,
    priority: 'high' as const,
  },
  
  FEEDBACK: {
    loop: false,
    autoplay: true,
    speed: 1,
    priority: 'high' as const,
  },
  
  INTERACTIVE: {
    loop: false,
    autoplay: false,
    speed: 1.2,
    priority: 'medium' as const,
  },
  
  MILESTONES: {
    loop: false,
    autoplay: true,
    speed: 1,
    priority: 'low' as const,
  },
  
  TRANSACTIONS: {
    loop: true,
    autoplay: true,
    speed: 0.8,
    priority: 'high' as const,
  },
} as const;

export const ANIMATION_DURATIONS = {
  // Standard durations in milliseconds
  QUICK: 300,
  NORMAL: 600,
  SLOW: 1000,
  VERY_SLOW: 2000,
} as const;

export const FALLBACK_ANIMATIONS = {
  // CSS fallback classes for reduced motion or errors
  LOADING: 'animate-spin',
  SUCCESS: 'animate-bounce',
  ERROR: 'animate-pulse',
  INTERACTIVE: 'transition-all duration-200 ease-in-out',
} as const;

// Animation preload priorities
export const PRELOAD_ANIMATIONS = {
  CRITICAL: [
    ANIMATION_PATHS.LOADING.SPINNER,
    ANIMATION_PATHS.LOADING.DOTS,
    ANIMATION_PATHS.FEEDBACK.SUCCESS,
    ANIMATION_PATHS.FEEDBACK.ERROR,
  ],
  
  IMPORTANT: [
    ANIMATION_PATHS.LOADING.PROGRESS,
    ANIMATION_PATHS.FEEDBACK.CHECKMARK,
    ANIMATION_PATHS.INTERACTIVE.BUTTON_HOVER,
    ANIMATION_PATHS.TRANSACTIONS.PENDING,
  ],
  
  OPTIONAL: [
    ANIMATION_PATHS.MILESTONES.TOKEN_CREATED,
    ANIMATION_PATHS.MILESTONES.WELCOME,
    ANIMATION_PATHS.INTERACTIVE.MENU_EXPAND,
  ],
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  MAX_FILE_SIZE: {
    LOADING: 30 * 1024, // 30KB
    INTERACTIVE: 25 * 1024, // 25KB
    FEEDBACK: 60 * 1024, // 60KB
    MILESTONES: 150 * 1024, // 150KB
  },
  
  MAX_CACHE_SIZE: 50,
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  PRELOAD_DELAY: {
    HIGH: 0,
    MEDIUM: 100,
    LOW: 500,
  },
} as const;

// Animation context mappings
export const ANIMATION_CONTEXTS = {
  // Map specific UI contexts to appropriate animations
  TOKEN_FORM: {
    LOADING: ANIMATION_PATHS.LOADING.PROGRESS,
    SUCCESS: ANIMATION_PATHS.MILESTONES.TOKEN_CREATED,
    ERROR: ANIMATION_PATHS.FEEDBACK.ERROR,
  },
  
  LOGIN_FORM: {
    LOADING: ANIMATION_PATHS.LOADING.DOTS,
    SUCCESS: ANIMATION_PATHS.FEEDBACK.SUCCESS,
    ERROR: ANIMATION_PATHS.FEEDBACK.ERROR,
  },
  
  DASHBOARD: {
    LOADING: ANIMATION_PATHS.LOADING.SKELETON,
    EMPTY_STATE: ANIMATION_PATHS.LOADING.PULSE,
  },
  
  MARKETPLACE: {
    LOADING: ANIMATION_PATHS.LOADING.SPINNER,
    SUCCESS: ANIMATION_PATHS.FEEDBACK.SUCCESS,
  },
  
  NAVIGATION: {
    HOVER: ANIMATION_PATHS.INTERACTIVE.MENU_EXPAND,
    CLICK: ANIMATION_PATHS.INTERACTIVE.TAB_SWITCH,
  },
} as const;

export type AnimationPath = typeof ANIMATION_PATHS[keyof typeof ANIMATION_PATHS][keyof typeof ANIMATION_PATHS[keyof typeof ANIMATION_PATHS]];
export type AnimationConfig = typeof ANIMATION_CONFIGS[keyof typeof ANIMATION_CONFIGS];
export type AnimationContext = keyof typeof ANIMATION_CONTEXTS;