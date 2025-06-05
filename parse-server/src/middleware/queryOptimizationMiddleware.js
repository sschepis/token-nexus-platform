const queryOptimizer = require('../utils/queryOptimizer');

/**
 * Middleware to optimize Parse queries
 * @param {Object} req Express request object
 * @param {Object} res Express response object
 * @param {Function} next Next middleware function
 */
function queryOptimizationMiddleware(req, res, next) {
  // Only intercept Parse API requests
  if (!req.auth || !req.config) {
    return next();
  }

  // Store original query function
  const originalQuery = req.config.database.adapter.find;

  // Replace with optimized version
  req.config.database.adapter.find = async function (className, query, options = {}) {
    // Wrap query with optimizer
    const wrappedQuery = queryOptimizer.wrapQuery(
      {
        find: () => originalQuery.call(this, className, query, options),
        ...query,
      },
      className
    );

    try {
      return await wrappedQuery.find();
    } catch (error) {
      // Log error but don't block query execution
      console.error('Query optimization error:', error);

      // Fall back to original query
      return originalQuery.call(this, className, query, options);
    }
  };

  next();
}

module.exports = queryOptimizationMiddleware;
