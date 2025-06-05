/**
 * Parse Server Integration Service
 * Manages integration between Parse Server and the existing tenant system
 */

const Parse = require('parse/node');
const logger = require('../utils/logger');

class ParseServerIntegration {
  constructor(databaseManager, tenantContext) {
    this.dbManager = databaseManager;
    this.tenantContext = tenantContext;
    this.initialized = false;
  }

  /**
   * Initialize Parse Server integration
   */
  async initialize(config) {
    try {
      logger.info('[Parse Integration] Initializing Parse Server integration');

      // Initialize Parse SDK
      Parse.initialize(config.parseServer.appId, null, config.parseServer.masterKey);
      Parse.serverURL = config.parseServer.serverURL;

      // Set up tenant-aware Parse operations
      this.setupTenantAwareOperations();

      // Initialize tenant schemas if using PostgreSQL
      if (config.databaseManager) {
        await this.initializeTenantSchemas();
      }

      this.initialized = true;
      logger.info('[Parse Integration] Parse Server integration initialized successfully');
    } catch (error) {
      logger.error('[Parse Integration] Failed to initialize Parse Server integration:', error);
      throw error;
    }
  }

  /**
   * Set up tenant-aware Parse operations
   */
  setupTenantAwareOperations() {
    // Override Parse.Query to be tenant-aware
    const originalQuery = Parse.Query;
    
    Parse.Query = class TenantAwareQuery extends originalQuery {
      constructor(objectClass) {
        super(objectClass);
        
        // Automatically add tenant filter if tenant context is available
        const tenantId = global.currentTenantId;
        if (tenantId && tenantId !== 'default') {
          // Add tenant filter to all queries
          this.equalTo('tenantId', tenantId);
        }
      }
    };

    // Override Parse.Object save to add tenant context
    const originalSave = Parse.Object.prototype.save;
    Parse.Object.prototype.save = function(attrs, options) {
      const tenantId = global.currentTenantId;
      if (tenantId && tenantId !== 'default' && !this.get('tenantId')) {
        this.set('tenantId', tenantId);
      }
      return originalSave.call(this, attrs, options);
    };

    logger.debug('[Parse Integration] Tenant-aware Parse operations configured');
  }

  /**
   * Initialize tenant schemas in Parse Server
   */
  async initializeTenantSchemas() {
    try {
      logger.info('[Parse Integration] Initializing tenant schemas');

      // Get all active tenants
      const tenants = await this.dbManager.getActiveTenants();
      
      for (const tenant of tenants) {
        await this.initializeTenantSchema(tenant.id);
      }

      logger.info(`[Parse Integration] Initialized schemas for ${tenants.length} tenants`);
    } catch (error) {
      logger.error('[Parse Integration] Failed to initialize tenant schemas:', error);
      throw error;
    }
  }

  /**
   * Initialize schema for a specific tenant
   */
  async initializeTenantSchema(tenantId) {
    try {
      // Set tenant context
      global.currentTenantId = tenantId;

      // Define core Parse classes that should exist in each tenant
      const coreClasses = [
        {
          className: 'SmartContract',
          fields: {
            name: { type: 'String', required: true },
            address: { type: 'String', required: true },
            abi: { type: 'Array' },
            network: { type: 'String', required: true },
            deployedAt: { type: 'Date' },
            isActive: { type: 'Boolean', defaultValue: true },
            tenantId: { type: 'String', required: true }
          },
          indexes: {
            address_network: { address: 1, network: 1 },
            tenantId: { tenantId: 1 }
          }
        },
        {
          className: 'ContractEvent',
          fields: {
            contractAddress: { type: 'String', required: true },
            eventName: { type: 'String', required: true },
            blockNumber: { type: 'Number', required: true },
            transactionHash: { type: 'String', required: true },
            logIndex: { type: 'Number', required: true },
            args: { type: 'Object' },
            timestamp: { type: 'Date', required: true },
            tenantId: { type: 'String', required: true }
          },
          indexes: {
            contract_block: { contractAddress: 1, blockNumber: 1 },
            transaction: { transactionHash: 1 },
            tenantId: { tenantId: 1 }
          }
        },
        {
          className: 'Organization',
          fields: {
            name: { type: 'String', required: true },
            slug: { type: 'String', required: true },
            status: { type: 'String', required: true },
            settings: { type: 'Object' },
            tenantId: { type: 'String', required: true }
          },
          indexes: {
            slug: { slug: 1 },
            tenantId: { tenantId: 1 }
          }
        }
      ];

      // Create schemas for core classes
      for (const classConfig of coreClasses) {
        await this.createOrUpdateSchema(classConfig);
      }

      logger.debug(`[Parse Integration] Initialized schema for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`[Parse Integration] Failed to initialize schema for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      // Clear tenant context
      global.currentTenantId = null;
    }
  }

  /**
   * Create or update a Parse class schema
   */
  async createOrUpdateSchema(classConfig) {
    try {
      const schema = new Parse.Schema(classConfig.className);

      // Add fields
      for (const [fieldName, fieldConfig] of Object.entries(classConfig.fields)) {
        if (fieldConfig.type === 'String') {
          schema.addString(fieldName, fieldConfig.required);
        } else if (fieldConfig.type === 'Number') {
          schema.addNumber(fieldName, fieldConfig.required);
        } else if (fieldConfig.type === 'Boolean') {
          schema.addBoolean(fieldName, fieldConfig.required);
        } else if (fieldConfig.type === 'Date') {
          schema.addDate(fieldName, fieldConfig.required);
        } else if (fieldConfig.type === 'Array') {
          schema.addArray(fieldName, fieldConfig.required);
        } else if (fieldConfig.type === 'Object') {
          schema.addObject(fieldName, fieldConfig.required);
        }

        // Set default value if specified
        if (fieldConfig.defaultValue !== undefined) {
          schema.addField(fieldName, fieldConfig.type, {
            defaultValue: fieldConfig.defaultValue
          });
        }
      }

      // Add indexes
      if (classConfig.indexes) {
        for (const [indexName, indexFields] of Object.entries(classConfig.indexes)) {
          schema.addIndex(indexName, indexFields);
        }
      }

      // Save or update schema
      await schema.save();
      logger.debug(`[Parse Integration] Schema created/updated for ${classConfig.className}`);
    } catch (error) {
      if (error.code === Parse.Error.INVALID_CLASS_NAME) {
        // Class already exists, try to update it
        logger.debug(`[Parse Integration] Class ${classConfig.className} already exists, skipping`);
      } else {
        logger.error(`[Parse Integration] Failed to create schema for ${classConfig.className}:`, error);
        throw error;
      }
    }
  }

  /**
   * Get tenant-specific Parse query
   */
  getTenantQuery(className, tenantId) {
    const query = new Parse.Query(className);
    if (tenantId && tenantId !== 'default') {
      query.equalTo('tenantId', tenantId);
    }
    return query;
  }

  /**
   * Create tenant-specific Parse object
   */
  createTenantObject(className, tenantId, attributes = {}) {
    const ParseClass = Parse.Object.extend(className);
    const object = new ParseClass();
    
    if (tenantId && tenantId !== 'default') {
      object.set('tenantId', tenantId);
    }
    
    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
      object.set(key, value);
    }
    
    return object;
  }

  /**
   * Check if a smart contract exists for a tenant
   */
  async hasSmartContract(contractName, tenantId) {
    try {
      const query = this.getTenantQuery('SmartContract', tenantId);
      query.equalTo('name', contractName);
      query.limit(1);
      
      const results = await query.find({ useMasterKey: true });
      return results.length > 0;
    } catch (error) {
      logger.error(`[Parse Integration] Error checking smart contract ${contractName} for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get smart contracts for a tenant
   */
  async getSmartContracts(tenantId) {
    try {
      const query = this.getTenantQuery('SmartContract', tenantId);
      query.equalTo('isActive', true);
      
      const results = await query.find({ useMasterKey: true });
      return results.map(contract => ({
        id: contract.id,
        name: contract.get('name'),
        address: contract.get('address'),
        network: contract.get('network'),
        abi: contract.get('abi'),
        deployedAt: contract.get('deployedAt'),
        tenantId: contract.get('tenantId')
      }));
    } catch (error) {
      logger.error(`[Parse Integration] Error getting smart contracts for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Import smart contract for a tenant
   */
  async importSmartContract(contractData, tenantId) {
    try {
      const contract = this.createTenantObject('SmartContract', tenantId, {
        name: contractData.name,
        address: contractData.address,
        abi: contractData.abi,
        network: contractData.network,
        deployedAt: contractData.deployedAt || new Date(),
        isActive: true
      });

      await contract.save(null, { useMasterKey: true });
      
      logger.info(`[Parse Integration] Imported smart contract ${contractData.name} for tenant ${tenantId}`);
      return contract;
    } catch (error) {
      logger.error(`[Parse Integration] Error importing smart contract for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup tenant data
   */
  async cleanupTenantData(tenantId) {
    try {
      logger.info(`[Parse Integration] Cleaning up data for tenant ${tenantId}`);

      const classesToCleanup = ['SmartContract', 'ContractEvent', 'Organization'];
      
      for (const className of classesToCleanup) {
        const query = this.getTenantQuery(className, tenantId);
        const objects = await query.find({ useMasterKey: true });
        
        if (objects.length > 0) {
          await Parse.Object.destroyAll(objects, { useMasterKey: true });
          logger.debug(`[Parse Integration] Deleted ${objects.length} ${className} objects for tenant ${tenantId}`);
        }
      }

      logger.info(`[Parse Integration] Cleanup completed for tenant ${tenantId}`);
    } catch (error) {
      logger.error(`[Parse Integration] Error cleaning up tenant data for ${tenantId}:`, error);
      throw error;
    }
  }
}

module.exports = ParseServerIntegration;