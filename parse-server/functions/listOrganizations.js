/* global Parse */

/**
 * List organizations cloud function
 */

const logger = require('../src/utils/logger');

module.exports = middlewares => async req => {
  try {
    // Apply auth middleware
    await middlewares.auth(req);

    // Apply admin middleware
    await middlewares.admin(req);

    // Validate parameters
    const paramSchema = {
      sortBy: { type: 'string', required: false, default: 'name' },
      sortOrder: { type: 'string', required: false, default: 'asc', enum: ['asc', 'desc'] },
      limit: { type: 'number', required: false, default: 100 },
      skip: { type: 'number', required: false, default: 0 },
    };

    await middlewares.validateParams(paramSchema)(req);

    const { sortBy = 'name', sortOrder = 'asc', limit = 100, skip = 0 } = req.params;

    // Build query
    const query = new Parse.Query('Organization');

    // Apply sorting
    if (sortOrder === 'desc') {
      query.descending(sortBy);
    } else {
      query.ascending(sortBy);
    }

    // Apply pagination
    query.limit(limit);
    query.skip(skip);

    // Fetch organizations
    const [organizations, count] = await Promise.all([
      query.find({ useMasterKey: true }),
      query.count({ useMasterKey: true }),
    ]);

    logger.info(`Found ${organizations.length} organizations`);

    const result = {
      results: organizations.map(org => ({
        id: org.id,
        name: org.get('name'),
        subdomain: org.get('subdomain'),
        industry: org.get('industry'),
        size: org.get('size'),
        plan: org.get('plan'),
        status: org.get('status'),
        createdAt: org.get('createdAt'),
        updatedAt: org.get('updatedAt'),
      })),
      count,
      limit,
      skip,
      hasMore: skip + organizations.length < count,
    };

    logger.info('listOrganizations executed', {
      userId: req.user?.id,
      count: result.count,
      limit: result.limit,
      skip: result.skip,
    });

    return result;
  } catch (error) {
    logger.error('Error in listOrganizations:', error);
    throw error;
  }
};
