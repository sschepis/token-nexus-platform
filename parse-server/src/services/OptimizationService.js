/**
 * Optimization Service
 * Handles content optimization, SEO, media assets, and performance
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const BaseService = require('./BaseService');

// Try to load sharp, but handle gracefully if it fails
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp package not available for OptimizationService, image optimization will be disabled:', error.message);
  sharp = null;
}

class OptimizationService extends BaseService {
  constructor() {
    super('Optimization');
  }

  /**
   * Service-specific initialization
   * @param {Object} options Initialization options
   */
  async _initializeService(options) {
    // Register dependencies - these are singleton instances, not classes
    try {
      const cacheService = require('./CacheService');
      const aiService = require('./AIService');
      const mediaManager = require('../media/MediaManager');

      this.registerDependency('cache', cacheService);
      this.registerDependency('ai', aiService);
      this.registerDependency('media', mediaManager);
    } catch (error) {
      console.warn('Some dependencies not available for OptimizationService:', error.message);
      // Continue initialization even if some dependencies are missing
    }

    // Initialize components in parallel
    await Promise.all([this._initializeMediaManager(), this._initializeCache()]);

    // Register cleanup handlers
    this.registerCleanup(async () => {
      const media = this.getDependency('media');
      await media.cleanup();
    });
  }

  /**
   * Analyze content for SEO optimization
   * @param {Object} content Content to analyze
   * @returns {Promise<Object>} SEO analysis results
   */
  async analyzeSEO(content) {
    this.validateInitialization();
    const cacheKey = this.generateCacheKey('seo_analysis', content);
    const cache = this.getDependency('cache');
    const ai = this.getDependency('ai');

    try {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      // Run analyses in parallel
      const [keywords, aiSuggestions] = await Promise.all([
        this._analyzeKeywords(content),
        ai.optimizeContent({
          title: content.title,
          content: content.content,
          type: 'seo',
        }),
      ]);

      const analysis = {
        keywords,
        meta: this._analyzeMetaTags(content),
        structure: this._analyzeContentStructure(content),
        suggestions: aiSuggestions,
      };

      analysis.score = this._calculateSEOScore(analysis);

      await cache.set(cacheKey, analysis, 3600); // Cache for 1 hour
      return analysis;
    } catch (error) {
      throw this.handleError(error, 'SEO analysis');
    }
  }

  /**
   * Optimize media asset
   * @param {Buffer} buffer Asset buffer
   * @param {Object} options Optimization options
   * @returns {Promise<Buffer>} Optimized asset
   */
  async optimizeMedia(buffer, options) {
    this.validateInitialization();
    const media = this.getDependency('media');

    try {
      return await media.optimizeAsset(buffer, options);
    } catch (error) {
      throw this.handleError(error, 'media optimization');
    }
  }

  /**
   * Analyze page performance
   * @param {string} url Page URL
   * @returns {Promise<Object>} Performance analysis
   */
  async analyzePerformance(url) {
    this.validateInitialization();
    const cacheKey = this.generateCacheKey('performance', url);
    const cache = this.getDependency('cache');

    try {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;

      const { stdout } = await execAsync(
        `lighthouse ${url} --output json --chrome-flags="--headless --no-sandbox --disable-gpu"`
      );
      const results = JSON.parse(stdout);

      const analysis = {
        performance: {
          score: results.categories.performance.score,
          metrics: this._extractPerformanceMetrics(results.audits),
        },
        resources: this._analyzeResources(results.audits),
        opportunities: results.audits['opportunities']?.details || [],
        diagnostics: results.audits['diagnostics']?.details || [],
      };

      await cache.set(cacheKey, analysis, 3600); // Cache for 1 hour
      return analysis;
    } catch (error) {
      throw this.handleError(error, 'performance analysis');
    }
  }

  /**
   * Generate lazy loading code
   * @param {Object} params Generation parameters
   * @returns {Object} Generated code
   */
  generateLazyLoading(params) {
    this.validateInitialization();

    const { selector, threshold = 0.5, rootMargin = '50px', src } = params;

    return {
      html: `<div class="lazy-container" data-src="${src}"></div>`,
      javascript: `
        const initLazyLoading = () => {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  const container = entry.target;
                  const src = container.dataset.src;
                  const img = new Image();
                  img.src = src;
                  img.loading = 'lazy';
                  img.onload = () => {
                    container.innerHTML = '';
                    container.appendChild(img);
                  };
                  observer.unobserve(container);
                }
              });
            },
            {
              threshold: ${threshold},
              rootMargin: '${rootMargin}'
            }
          );

          document.querySelectorAll('${selector}').forEach(
            container => observer.observe(container)
          );
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initLazyLoading);
        } else {
          initLazyLoading();
        }
      `,
    };
  }

  /**
   * Initialize media manager
   * @private
   */
  async _initializeMediaManager() {
    const media = this.getDependency('media');
    await media.initialize(this.config.media);
  }

  /**
   * Initialize cache settings
   * @private
   */
  async _initializeCache() {
    const cache = this.getDependency('cache');
    if (!this.config.cache.enabled) return;
    await cache.initialize(this.config.cache);
  }

  /**
   * Extract performance metrics from Lighthouse audits
   * @param {Object} audits Lighthouse audits
   * @returns {Object} Performance metrics
   * @private
   */
  _extractPerformanceMetrics(audits) {
    const metrics = [
      'first-contentful-paint',
      'speed-index',
      'largest-contentful-paint',
      'interactive',
      'total-blocking-time',
    ];

    return metrics.reduce((acc, metric) => {
      acc[metric] = audits[metric]?.numericValue || 0;
      return acc;
    }, {});
  }

  /**
   * Analyze keywords in content
   * @param {Object} content Content to analyze
   * @returns {Promise<Object>} Keyword analysis
   * @private
   */
  async _analyzeKeywords(content) {
    const text = `${content.title} ${content.content}`.toLowerCase();
    const words = text.match(/\b\w+\b/g) || [];

    const frequencies = new Map();
    words.forEach(word => {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    });

    const sortedWords = Array.from(frequencies.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const ai = this.getDependency('ai');
    const relevanceScores = await ai.analyzeKeywordRelevance(
      sortedWords.map(([word]) => word),
      content.type
    );

    return {
      primary: sortedWords[0][0],
      secondary: sortedWords.slice(1, 3).map(([word]) => word),
      all: sortedWords.map(([word, frequency]) => ({
        word,
        frequency,
        relevance: relevanceScores[word] || 0,
      })),
    };
  }

  /**
   * Analyze meta tags
   * @param {Object} content Content to analyze
   * @returns {Object} Meta tag analysis
   * @private
   */
  _analyzeMetaTags(content) {
    const { title, description = '', keywords = [] } = content;

    const analysis = {
      title: this._analyzeMetaField(title, 30, 60, 'Title'),
      description: this._analyzeMetaField(description, 120, 160, 'Description'),
      keywords: {
        count: keywords.length,
        optimal: keywords.length >= 5 && keywords.length <= 10,
        suggestions: [],
      },
    };

    if (!analysis.keywords.optimal) {
      analysis.keywords.suggestions.push(
        keywords.length < 5 ? 'Add more keywords' : 'Too many keywords'
      );
    }

    return analysis;
  }

  /**
   * Analyze a meta field
   * @param {string} value Field value
   * @param {number} minLength Minimum length
   * @param {number} maxLength Maximum length
   * @param {string} fieldName Field name
   * @returns {Object} Field analysis
   * @private
   */
  _analyzeMetaField(value, minLength, maxLength, fieldName) {
    const length = value.length;
    const optimal = length >= minLength && length <= maxLength;

    return {
      length,
      optimal,
      suggestions: optimal
        ? []
        : [`${fieldName} is ${length < minLength ? 'too short' : 'too long'}`],
    };
  }
}

module.exports = new OptimizationService();
