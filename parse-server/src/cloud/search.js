/**
 * Search Cloud Functions
 * Exposes search functionality through Parse Cloud Functions
 */

const SearchService = require('../services/SearchService');

/**
 * Initialize search cloud functions
 */
function initialize() {
  // Search documents
  Parse.Cloud.define('search', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.type) {
        throw new Error('Missing required parameter: type');
      }

      // Add organization filter if applicable
      const filters = params.filters || {};
      if (params.organizationId) {
        filters.organization_id = params.organizationId;
      }

      const results = await SearchService.search({
        type: params.type,
        query: params.query,
        filters: filters,
        facets: params.facets,
        page: params.page,
        limit: params.limit,
        sort: params.sort,
      });

      return results;
    } catch (error) {
      console.error('Search error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to perform search');
    }
  });

  // Get search suggestions
  Parse.Cloud.define('getSearchSuggestions', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.type || !params.prefix) {
        throw new Error('Missing required parameters: type and prefix are required');
      }

      const suggestions = await SearchService.getSuggestions({
        type: params.type,
        prefix: params.prefix,
        limit: params.limit,
      });

      return suggestions;
    } catch (error) {
      console.error('Suggestions error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to get search suggestions');
    }
  });

  // Index document
  Parse.Cloud.define('indexDocument', async request => {
    try {
      const { user, params } = request;

      // Ensure user has permission
      if (!user) {
        throw new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, 'User must be authenticated');
      }

      // Validate required parameters
      if (!params.type || !params.document) {
        throw new Error('Missing required parameters: type and document are required');
      }

      await SearchService.indexDocument(params.type, params.document);
      return { success: true };
    } catch (error) {
      console.error('Indexing error:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to index document');
    }
  });

  // After save triggers for automatic indexing
  Parse.Cloud.afterSave('Content', async request => {
    try {
      const content = request.object;
      await SearchService.indexDocument('content', content.toJSON());
    } catch (error) {
      console.error('Error indexing content:', error);
    }
  });

  Parse.Cloud.afterSave(Parse.User, async request => {
    try {
      const user = request.object;
      await SearchService.indexDocument('user', user.toJSON());
    } catch (error) {
      console.error('Error indexing user:', error);
    }
  });

  // Before delete triggers for removing documents from index
  Parse.Cloud.beforeDelete('Content', async request => {
    try {
      const content = request.object;
      await SearchService.deleteDocument('content', content.id);
    } catch (error) {
      console.error('Error removing content from index:', error);
    }
  });

  Parse.Cloud.beforeDelete(Parse.User, async request => {
    try {
      const user = request.object;
      await SearchService.deleteDocument('user', user.id);
    } catch (error) {
      console.error('Error removing user from index:', error);
    }
  });
}

module.exports = {
  initialize,
};
