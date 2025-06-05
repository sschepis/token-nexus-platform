/**
 * Optimization Cloud Functions
 * Exposes optimization functionality through Parse Cloud Functions
 */

const OptimizationService = require('../services/OptimizationService');

/**
 * Initialize optimization cloud functions
 */
function initialize() {
  // Analyze SEO
  Parse.Cloud.define('analyzeSEO', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.content) {
        throw new Error('Missing required parameter: content');
      }

      const analysis = await OptimizationService.analyzeSEO(params.content);
      return analysis;
    } catch (error) {
      console.error('SEO analysis error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to analyze SEO');
    }
  });

  // Optimize media
  Parse.Cloud.define('optimizeMedia', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.file || !params.options) {
        throw new Error('Missing required parameters: file and options are required');
      }

      // Get file data
      const file = await Parse.File.fetch(params.file.url);
      const buffer = await file.getData();

      const result = await OptimizationService.optimizeMedia(buffer, params.options);

      // Save optimized file
      const optimizedFile = new Parse.File(`optimized_${params.file.name}`, {
        base64: result.buffer.toString('base64'),
      });
      await optimizedFile.save();

      return {
        file: optimizedFile,
        cdnUrl: result.cdnUrl,
      };
    } catch (error) {
      console.error('Media optimization error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to optimize media');
    }
  });

  // Analyze performance
  Parse.Cloud.define('analyzePerformance', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.url) {
        throw new Error('Missing required parameter: url');
      }

      const analysis = await OptimizationService.analyzePerformance(params.url);
      return analysis;
    } catch (error) {
      console.error('Performance analysis error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to analyze performance');
    }
  });

  // Generate lazy loading code
  Parse.Cloud.define('generateLazyLoading', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.selector || !params.src) {
        throw new Error('Missing required parameters: selector and src are required');
      }

      const code = OptimizationService.generateLazyLoading(params);
      return code;
    } catch (error) {
      console.error('Lazy loading generation error:', error);
      throw new Parse.Error(
        Parse.Error.INTERNAL_SERVER_ERROR,
        'Failed to generate lazy loading code'
      );
    }
  });

  // Before save trigger for Content
  Parse.Cloud.beforeSave('Content', async request => {
    try {
      const content = request.object;

      // Only analyze if content is new or content/title has changed
      if (content.isNew() || content.dirty('content') || content.dirty('title')) {
        // Analyze SEO
        const analysis = await OptimizationService.analyzeSEO({
          title: content.get('title'),
          content: content.get('content'),
          description: content.get('description'),
          keywords: content.get('keywords'),
          type: content.get('type'),
        });

        content.set('seoAnalysis', analysis);
        content.set('seoScore', analysis.score);
      }
    } catch (error) {
      console.error('Content optimization error:', error);
      // Don't block save on optimization error
    }
  });

  // After save trigger for ParseFile
  Parse.Cloud.afterSave(Parse.File, async request => {
    try {
      const file = request.object;

      // Only optimize images
      if (file.type().startsWith('image/')) {
        const buffer = await file.getData();

        // Optimize with default settings
        const result = await OptimizationService.optimizeMedia(buffer, {
          type: 'image',
          quality: 80,
          format: file.type().split('/')[1],
        });

        // Save optimization metadata
        const Optimization = Parse.Object.extend('FileOptimization');
        const optimization = new Optimization();
        optimization.set('file', file);
        optimization.set('originalSize', buffer.length);
        optimization.set('optimizedSize', result.buffer.length);
        optimization.set('savings', buffer.length - result.buffer.length);
        optimization.set('cdnUrl', result.cdnUrl);

        await optimization.save(null, { useMasterKey: true });
      }
    } catch (error) {
      console.error('File optimization error:', error);
    }
  });
}

module.exports = {
  initialize,
};
