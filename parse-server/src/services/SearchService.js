/**
 * Search Service
 * Handles Elasticsearch integration and search functionality
 */

const { Client } = require('@elastic/elasticsearch');
const config = require('../config');

class SearchService {
  constructor() {
    // Default configuration if none provided
    const defaultConfig = {
      enabled: false,
      engine: {
        host: 'http://localhost',
        port: 9200,
        auth: {
          username: 'elastic',
          password: 'changeme',
        },
      },
      indices: {
        content: {
          prefix: 'cms',
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            refresh_interval: '1s',
          },
        },
        user: {
          prefix: 'cms',
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            refresh_interval: '1s',
          },
        },
      },
      features: {
        highlighting: true,
        suggestions: true,
      },
    };

    this.config = config.search || defaultConfig;
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize the search service
   */
  async initialize() {
    // If search is not configured, just mark as initialized but disabled
    if (!this.config || !this.config.enabled) {
      console.log('Search service is disabled');
      this.initialized = true;
      return;
    }

    try {
      // Initialize Elasticsearch client
      this.client = new Client({
        node: `${this.config.engine.host}:${this.config.engine.port}`,
        auth: {
          username: this.config.engine.auth.username,
          password: this.config.engine.auth.password,
        },
      });

      // Verify connection
      await this.client.ping();

      // Initialize indices
      await this._initializeIndices();

      this.initialized = true;
      console.log('Search service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize search service:', error);
      // Don't throw error, just mark as not initialized
      this.initialized = false;
    }
  }

  /**
   * Check if search is available
   * @private
   */
  _checkAvailability() {
    if (!this.initialized || !this.config.enabled) {
      throw new Error('Search service is not available');
    }
  }

  /**
   * Index a document
   * @param {string} type Document type (content, user, etc.)
   * @param {Object} document Document to index
   */
  async indexDocument(type, document) {
    this._checkAvailability();

    try {
      const index = `${this.config.indices[type].prefix || 'cms'}_${type}`;

      await this.client.index({
        index,
        id: document.id || document.objectId,
        document: this._prepareDocument(type, document),
        refresh: true,
      });
    } catch (error) {
      console.error('Failed to index document:', error);
      throw error;
    }
  }

  /**
   * Search documents
   * @param {Object} params Search parameters
   * @returns {Promise<Object>} Search results
   */
  async search(params) {
    this._checkAvailability();

    const { type, query, filters = {}, facets = [], page = 1, limit = 10, sort = [] } = params;

    try {
      const index = `${this.config.indices[type].prefix || 'cms'}_${type}`;

      const searchParams = {
        index,
        from: (page - 1) * limit,
        size: limit,
        body: {
          query: this._buildQuery(query, filters),
          sort: this._buildSort(sort),
          ...(facets.length > 0 && { aggs: this._buildAggregations(facets) }),
        },
      };

      if (this.config.features.highlighting) {
        searchParams.body.highlight = {
          fields: {
            title: {},
            content: {},
            tags: {},
          },
        };
      }

      const response = await this.client.search(searchParams);
      return this._formatSearchResults(response);
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions
   * @param {Object} params Suggestion parameters
   * @returns {Promise<Array>} Search suggestions
   */
  async getSuggestions(params) {
    if (!this.initialized || !this.config.features.suggestions) {
      throw new Error('Search suggestions are not available');
    }

    const { type, prefix, limit = 5 } = params;

    try {
      const index = `${this.config.indices[type].prefix || 'cms'}_${type}`;

      const response = await this.client.search({
        index,
        body: {
          suggest: {
            text: prefix,
            completion: {
              field: 'suggest',
              size: limit,
              fuzzy: {
                fuzziness: 'AUTO',
              },
            },
          },
        },
      });

      return this._formatSuggestions(response);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      throw error;
    }
  }

  /**
   * Initialize Elasticsearch indices
   * @private
   */
  async _initializeIndices() {
    for (const [type, config] of Object.entries(this.config.indices)) {
      const index = `${config.prefix || 'cms'}_${type}`;

      try {
        const exists = await this.client.indices.exists({ index });

        if (!exists) {
          await this.client.indices.create({
            index,
            body: {
              settings: {
                number_of_shards: config.settings.number_of_shards,
                number_of_replicas: config.settings.number_of_replicas,
                refresh_interval: config.settings.refresh_interval,
                analysis: {
                  analyzer: {
                    custom_analyzer: {
                      type: 'custom',
                      tokenizer: 'standard',
                      filter: ['lowercase', 'stop', 'snowball'],
                    },
                  },
                },
              },
              mappings: this._getMapping(type),
            },
          });

          console.log(`Created index: ${index}`);
        }
      } catch (error) {
        console.error(`Failed to initialize index ${index}:`, error);
        throw error;
      }
    }
  }

  /**
   * Get mapping for a specific type
   * @param {string} type Document type
   * @returns {Object} Elasticsearch mapping
   * @private
   */
  _getMapping(type) {
    const baseMapping = {
      properties: {
        id: { type: 'keyword' },
        title: {
          type: 'text',
          analyzer: 'custom_analyzer',
          fields: {
            keyword: { type: 'keyword' },
          },
        },
        content: {
          type: 'text',
          analyzer: 'custom_analyzer',
        },
        tags: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        suggest: {
          type: 'completion',
          analyzer: 'custom_analyzer',
        },
      },
    };

    // Add type-specific mappings
    switch (type) {
      case 'content':
        return {
          ...baseMapping,
          properties: {
            ...baseMapping.properties,
            status: { type: 'keyword' },
            author: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
              },
            },
          },
        };

      case 'user':
        return {
          ...baseMapping,
          properties: {
            ...baseMapping.properties,
            email: { type: 'keyword' },
            role: { type: 'keyword' },
          },
        };

      default:
        return baseMapping;
    }
  }

  /**
   * Build Elasticsearch query
   * @param {string} query Search query
   * @param {Object} filters Search filters
   * @returns {Object} Elasticsearch query
   * @private
   */
  _buildQuery(query, filters) {
    const must = [];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^2', 'content', 'tags'],
          type: 'best_fields',
          tie_breaker: 0.3,
          minimum_should_match: '70%',
        },
      });
    }

    // Add filters
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        must.push({ terms: { [field]: value } });
      } else if (typeof value === 'object') {
        must.push({ range: { [field]: value } });
      } else {
        must.push({ term: { [field]: value } });
      }
    });

    return {
      bool: { must },
    };
  }

  /**
   * Build sort parameters
   * @param {Array} sort Sort configuration
   * @returns {Array} Elasticsearch sort parameters
   * @private
   */
  _buildSort(sort) {
    return sort.map(item => {
      if (typeof item === 'string') {
        const order = item.startsWith('-') ? 'desc' : 'asc';
        const field = item.replace(/^-/, '');
        return { [field]: order };
      }
      return item;
    });
  }

  /**
   * Build aggregations for faceted search
   * @param {Array} facets Requested facets
   * @returns {Object} Elasticsearch aggregations
   * @private
   */
  _buildAggregations(facets) {
    const aggs = {};

    facets.forEach(facet => {
      if (typeof facet === 'string') {
        aggs[facet] = { terms: { field: facet } };
      } else {
        aggs[facet.name] = {
          [facet.type]: {
            field: facet.field,
            ...facet.options,
          },
        };
      }
    });

    return aggs;
  }

  /**
   * Format search results
   * @param {Object} response Elasticsearch response
   * @returns {Object} Formatted results
   * @private
   */
  _formatSearchResults(response) {
    return {
      total: response.hits.total.value,
      hits: response.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        highlight: hit.highlight,
        ...hit._source,
      })),
      facets: response.aggregations
        ? Object.entries(response.aggregations).reduce((acc, [key, value]) => {
            acc[key] = value.buckets || value.value;
            return acc;
          }, {})
        : undefined,
    };
  }

  /**
   * Format suggestions
   * @param {Object} response Elasticsearch response
   * @returns {Array} Formatted suggestions
   * @private
   */
  _formatSuggestions(response) {
    return response.suggest.completion[0].options.map(option => ({
      text: option.text,
      score: option._score,
      ...option._source,
    }));
  }

  /**
   * Prepare document for indexing
   * @param {string} type Document type
   * @param {Object} document Document to prepare
   * @returns {Object} Prepared document
   * @private
   */
  _prepareDocument(type, document) {
    const prepared = {
      id: document.id || document.objectId,
      created_at: document.createdAt || new Date(),
      updated_at: document.updatedAt || new Date(),
    };

    // Add type-specific fields
    switch (type) {
      case 'content':
        return {
          ...prepared,
          title: document.title,
          content: document.content,
          tags: document.tags || [],
          status: document.status,
          author: document.author,
          suggest: {
            input: [document.title, ...(document.tags || [])],
          },
        };

      case 'user':
        return {
          ...prepared,
          email: document.email,
          name: `${document.firstName} ${document.lastName}`.trim(),
          role: document.role,
          suggest: {
            input: [document.email, `${document.firstName} ${document.lastName}`.trim()],
          },
        };

      default:
        return {
          ...prepared,
          ...document,
          suggest: {
            input: document.title ? [document.title] : [],
          },
        };
    }
  }
}

module.exports = new SearchService();
