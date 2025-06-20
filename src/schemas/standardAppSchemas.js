/**
 * Standard App Database Schemas
 * Defines Parse Server schemas for standard applications
 */

// On-Chain Identity Schema
const OnChainIdentitySchema = {
  className: 'OnChainIdentity',
  fields: {
    // Core fields
    user: { type: 'Pointer', targetClass: '_User', required: true },
    organizationId: { type: 'String', required: true },
    walletAddress: { type: 'String', required: true },
    
    // Contract information
    factoryAddress: { type: 'String', required: true },
    contractAddress: { type: 'String' },
    
    // Status and deployment
    status: { type: 'String', required: true }, // 'pending_deployment', 'deployed', 'error'
    deploymentTxHash: { type: 'String' },
    deploymentBlock: { type: 'Number' },
    deployedAt: { type: 'Date' },
    
    // On-chain data
    claims: { type: 'Array' },
    keys: { type: 'Array' },
    attributes: { type: 'Object' },
    controllers: { type: 'Array' },
    
    // Metadata
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedAt: { type: 'Date' }
  },
  indexes: {
    walletAddress_organizationId: { walletAddress: 1, organizationId: 1 },
    user_organizationId: { user: 1, organizationId: 1 },
    contractAddress: { contractAddress: 1 },
    status: { status: 1 }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  }
};

// Digital Asset Schema
const DigitalAssetSchema = {
  className: 'DigitalAsset',
  fields: {
    // Core fields
    user: { type: 'Pointer', targetClass: '_User', required: true },
    organizationId: { type: 'String', required: true },
    name: { type: 'String', required: true },
    description: { type: 'String', required: true },
    assetType: { type: 'String', required: true }, // 'invoice', 'carbon-credit', 'trade-document', etc.
    
    // Blockchain information
    contractAddress: { type: 'String', required: true },
    tokenId: { type: 'String' },
    tokenURI: { type: 'String' },
    mintToAddress: { type: 'String' },
    
    // Status and minting
    status: { type: 'String', required: true }, // 'pending_mint', 'minted', 'listed', 'sold', 'burned'
    mintTxHash: { type: 'String' },
    mintBlock: { type: 'Number' },
    mintedAt: { type: 'Date' },
    
    // Asset data
    metadata: { type: 'Object' },
    attributes: { type: 'Object' },
    visibility: { type: 'String', defaultValue: 'public' }, // 'public', 'private', 'organization'
    
    // Marketplace
    currentListing: { type: 'Pointer', targetClass: 'MarketplaceListing' },
    
    // Metadata
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedAt: { type: 'Date' }
  },
  indexes: {
    user_organizationId: { user: 1, organizationId: 1 },
    tokenId: { tokenId: 1 },
    assetType_status: { assetType: 1, status: 1 },
    status: { status: 1 },
    createdAt: { createdAt: -1 }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  }
};

// Marketplace Listing Schema
const MarketplaceListingSchema = {
  className: 'MarketplaceListing',
  fields: {
    // Core fields
    user: { type: 'Pointer', targetClass: '_User', required: true },
    organizationId: { type: 'String', required: true },
    asset: { type: 'Pointer', targetClass: 'DigitalAsset', required: true },
    
    // Listing information
    tokenId: { type: 'String', required: true },
    contractAddress: { type: 'String', required: true },
    marketplaceAddress: { type: 'String', required: true },
    marketplaceItemId: { type: 'String' },
    
    // Pricing
    price: { type: 'String', required: true }, // Store as string to handle large numbers
    paymentToken: { type: 'String', required: true }, // 'ETH', 'USDC', etc.
    
    // Status and blockchain
    status: { type: 'String', required: true }, // 'pending_listing', 'active', 'sold', 'cancelled', 'expired'
    listingTxHash: { type: 'String' },
    listingBlock: { type: 'Number' },
    listedAt: { type: 'Date' },
    
    // Sale information
    soldTo: { type: 'Pointer', targetClass: '_User' },
    soldPrice: { type: 'String' },
    saleTxHash: { type: 'String' },
    saleBlock: { type: 'Number' },
    soldAt: { type: 'Date' },
    
    // Metadata
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedBy: { type: 'Pointer', targetClass: '_User' },
    lastModifiedAt: { type: 'Date' }
  },
  indexes: {
    user_organizationId: { user: 1, organizationId: 1 },
    asset: { asset: 1 },
    status: { status: 1 },
    marketplaceItemId: { marketplaceItemId: 1 },
    createdAt: { createdAt: -1 }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  }
};

// Enhanced Identity Schema (for traditional KYC)
const IdentitySchema = {
  className: 'Identity',
  fields: {
    // Core fields
    user: { type: 'Pointer', targetClass: '_User', required: true },
    organizationId: { type: 'String', required: true },
    
    // Personal information
    firstName: { type: 'String', required: true },
    lastName: { type: 'String', required: true },
    email: { type: 'String', required: true },
    dateOfBirth: { type: 'Date' },
    nationality: { type: 'String' },
    phoneNumber: { type: 'String' },
    
    // Document information
    documentType: { type: 'String' },
    documentNumber: { type: 'String' },
    issuingCountry: { type: 'String' },
    expiryDate: { type: 'Date' },
    
    // Address information
    address: { type: 'Object' },
    
    // Verification status
    status: { type: 'String', required: true }, // 'pending_verification', 'verification_in_progress', 'verified', 'rejected'
    verificationLevel: { type: 'String', defaultValue: 'none' }, // 'none', 'basic', 'enhanced', 'premium'
    verifiedAt: { type: 'Date' },
    verifiedBy: { type: 'Pointer', targetClass: '_User' },
    
    // Links to on-chain identity
    onChainIdentity: { type: 'Pointer', targetClass: 'OnChainIdentity' },
    
    // Metadata
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedBy: { type: 'Pointer', targetClass: '_User', required: true },
    lastModifiedAt: { type: 'Date' }
  },
  indexes: {
    user_organizationId: { user: 1, organizationId: 1 },
    email: { email: 1 },
    status: { status: 1 },
    verificationLevel: { verificationLevel: 1 }
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    count: { requiresAuthentication: true },
    get: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    update: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  }
};

// Audit Log Schema
const AuditLogSchema = {
  className: 'AuditLog',
  fields: {
    // Core fields
    action: { type: 'String', required: true },
    entityType: { type: 'String', required: true },
    entityId: { type: 'String', required: true },
    userId: { type: 'String', required: true },
    
    // Details
    details: { type: 'Object' },
    timestamp: { type: 'Date', required: true },
    ipAddress: { type: 'String' },
    userAgent: { type: 'String' }
  },
  indexes: {
    action: { action: 1 },
    entityType_entityId: { entityType: 1, entityId: 1 },
    userId: { userId: 1 },
    timestamp: { timestamp: -1 }
  },
  classLevelPermissions: {
    find: { requiresAuthentication: true },
    count: { requiresAuthentication: true },
    get: { requiresAuthentication: true },
    create: { '*': true },
    update: {},
    delete: {}
  }
};

// Export all schemas
module.exports = {
  OnChainIdentitySchema,
  DigitalAssetSchema,
  MarketplaceListingSchema,
  IdentitySchema,
  AuditLogSchema,
  
  // Helper function to create all schemas
  createAllSchemas: async (Parse) => {
    const schemas = [
      OnChainIdentitySchema,
      DigitalAssetSchema,
      MarketplaceListingSchema,
      IdentitySchema,
      AuditLogSchema
    ];
    
    for (const schema of schemas) {
      try {
        const parseSchema = new Parse.Schema(schema.className);
        
        // Add fields
        Object.entries(schema.fields).forEach(([fieldName, fieldConfig]) => {
          if (fieldName === 'objectId' || fieldName === 'createdAt' || fieldName === 'updatedAt') {
            return; // Skip built-in fields
          }
          
          switch (fieldConfig.type) {
            case 'String':
              parseSchema.addString(fieldName, fieldConfig.required);
              break;
            case 'Number':
              parseSchema.addNumber(fieldName, fieldConfig.required);
              break;
            case 'Boolean':
              parseSchema.addBoolean(fieldName, fieldConfig.required);
              break;
            case 'Date':
              parseSchema.addDate(fieldName, fieldConfig.required);
              break;
            case 'Array':
              parseSchema.addArray(fieldName, fieldConfig.required);
              break;
            case 'Object':
              parseSchema.addObject(fieldName, fieldConfig.required);
              break;
            case 'Pointer':
              parseSchema.addPointer(fieldName, fieldConfig.targetClass, fieldConfig.required);
              break;
            case 'Relation':
              parseSchema.addRelation(fieldName, fieldConfig.targetClass);
              break;
          }
          
          // Set default value if specified
          if (fieldConfig.defaultValue !== undefined) {
            parseSchema.addField(fieldName, fieldConfig.type, {
              defaultValue: fieldConfig.defaultValue
            });
          }
        });
        
        // Set class level permissions
        if (schema.classLevelPermissions) {
          parseSchema.setCLP(schema.classLevelPermissions);
        }
        
        // Create or update schema
        await parseSchema.save();
        console.log(`✅ Schema created/updated: ${schema.className}`);
        
      } catch (error) {
        if (error.code === 103) {
          console.log(`⚠️  Schema already exists: ${schema.className}`);
        } else {
          console.error(`❌ Error creating schema ${schema.className}:`, error);
        }
      }
    }
    
    console.log('📦 Standard app schemas initialization complete');
  }
};