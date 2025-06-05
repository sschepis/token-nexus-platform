interface AnimationCache {
  [key: string]: {
    data: object;
    lastUsed: number;
    priority: 'high' | 'medium' | 'low';
  };
}

interface PreloadQueue {
  path: string;
  priority: 'high' | 'medium' | 'low';
}

class AnimationManager {
  private cache: AnimationCache = {};
  private preloadQueue: PreloadQueue[] = [];
  private isPreloading = false;
  private maxCacheSize = 50; // Maximum number of cached animations
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), this.cacheTimeout);
    
    // Start preloading critical animations
    this.startPreloading();
  }

  /**
   * Get animation data from cache or load it
   */
  async getAnimation(path: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<object | null> {
    // Check cache first
    const cached = this.cache[path];
    if (cached) {
      cached.lastUsed = Date.now();
      return cached.data;
    }

    // Load animation
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load animation: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the animation
      this.cacheAnimation(path, data, priority);
      
      return data;
    } catch (error) {
      console.error(`Failed to load animation from ${path}:`, error);
      return null;
    }
  }

  /**
   * Preload animation for future use
   */
  preload(path: string, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // Don't preload if already cached
    if (this.cache[path]) return;

    // Add to preload queue
    this.preloadQueue.push({ path, priority });
    
    // Sort queue by priority
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Start preloading if not already running
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }

  /**
   * Cache animation data
   */
  private cacheAnimation(path: string, data: object, priority: 'high' | 'medium' | 'low'): void {
    // Remove oldest items if cache is full
    if (Object.keys(this.cache).length >= this.maxCacheSize) {
      this.evictOldestCacheItems();
    }

    this.cache[path] = {
      data,
      lastUsed: Date.now(),
      priority,
    };
  }

  /**
   * Remove oldest cache items
   */
  private evictOldestCacheItems(): void {
    const entries = Object.entries(this.cache);
    
    // Sort by last used time and priority
    entries.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      return a[1].lastUsed - b[1].lastUsed;
    });

    // Remove the oldest 25% of items
    const itemsToRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      delete this.cache[entries[i][0]];
    }
  }

  /**
   * Clean up expired cache items
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of Object.entries(this.cache)) {
      // Keep high priority items longer
      const timeout = item.priority === 'high' ? this.cacheTimeout * 2 : this.cacheTimeout;
      
      if (now - item.lastUsed > timeout) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => delete this.cache[key]);
  }

  /**
   * Process the preload queue
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const item = this.preloadQueue.shift();
      if (!item) break;

      // Skip if already cached
      if (this.cache[item.path]) continue;

      try {
        await this.getAnimation(item.path, item.priority);
        
        // Add delay between preloads to avoid blocking
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to preload animation: ${item.path}`, error);
      }
    }

    this.isPreloading = false;
  }

  /**
   * Start preloading critical animations
   */
  private startPreloading(): void {
    // Preload critical animations that are likely to be used
    const criticalAnimations = [
      '/animations/loading/spinner.json',
      '/animations/loading/dots.json',
      '/animations/feedback/success.json',
      '/animations/feedback/error.json',
    ];

    criticalAnimations.forEach(path => {
      this.preload(path, 'high');
    });
  }

  /**
   * Clear all cached animations
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; items: string[] } {
    return {
      size: Object.keys(this.cache).length,
      items: Object.keys(this.cache),
    };
  }

  /**
   * Check if animation is cached
   */
  isCached(path: string): boolean {
    return !!this.cache[path];
  }
}

// Export singleton instance
export const animationManager = new AnimationManager();
export default animationManager;