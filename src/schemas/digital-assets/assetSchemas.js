/**
 * Digital Assets Parse Schemas
 * Database schema definitions for the Digital Assets standard application
 */

// Digital Asset Schema
const DigitalAssetSchema = {
  className: 'DigitalAsset',
  fields: {
    // Basic Asset Information
    name: {
      type: 'String',
      required: true
    },
    symbol: {
      type: 'String',
      required: true
    },
    description: {
      type: 'String'
    },
    assetType: {
      type: 'String',
      required: true
      // Values: token, nft, security, utility, governance, stablecoin, commodity
    },
    
    // Supply Information
    totalSupply: {
      type: 'Number',
      defaultValue: 0
    },
    currentSupply: {
      type: 'Number',
      defaultValue: 0
    },
    circulatingSupply: {
      type: 'Number',
      defaultValue: 0
    },
    burnedSupply: {
      type: 'Number',
      defaultValue: 0
    },
    decimals: {
      type: 'Number',
      defaultValue: 18
    },
    
    // Contract Information
    contractType: {
      type: 'String',
      defaultValue: 'ERC20'
      // Values: ERC20, ERC721, ERC1155, custom
    },
    contractAddress: {
      type: 'String'
    },
    contractABI: {
      type: 'Object'
    },
    network: {
      type: 'String'
      // Values: ethereum, polygon, bsc, arbitrum, etc.
    },
    
    // Asset Properties
    isTransferable: {
      type: 'Boolean',
      defaultValue: true
    },
    isBurnable: {
      type: 'Boolean',
      defaultValue: false
    },
    isMintable: {
      type: 'Boolean',
      defaultValue: true
    },
    isPausable: {
      type: 'Boolean',
      defaultValue: false
    },
    
    // Status and Lifecycle
    status: {
      type: 'String',
      defaultValue: 'draft'
      // Values: draft, deploying, deployed, paused, deprecated
    },
    deployedAt: {
      type: 'Date'
    },
    
    // Ownership and Permissions
    owner: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    createdBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    
    // Current deployment reference
    currentDeployment: {
      type: 'Pointer',
      targetClass: 'AssetDeployment'
    },
    
    // Metadata and Additional Information
    metadata: {
      type: 'Object'
    },
    tags: {
      type: 'Array'
    },
    category: {
      type: 'String'
    },
    
    // Compliance and Regulatory
    isCompliant: {
      type: 'Boolean',
      defaultValue: false
    },
    complianceLevel: {
      type: 'String'
      // Values: none, basic, enhanced, institutional
    },
    regulatoryFramework: {
      type: 'String'
    },
    
    // Market Information
    marketCap: {
      type: 'Number',
      defaultValue: 0
    },
    currentPrice: {
      type: 'Number',
      defaultValue: 0
    },
    priceHistory: {
      type: 'Array'
    }
  },
  classLevelPermissions: {
    find: {
      '*': true
    },
    count: {
      '*': true
    },
    get: {
      '*': true
    },
    create: {
      'role:user': true,
      'role:admin': true
    },
    update: {
      'role:admin': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    owner_1: { owner: 1 },
    symbol_1: { symbol: 1 },
    assetType_1: { assetType: 1 },
    status_1: { status: 1 },
    contractAddress_1: { contractAddress: 1 },
    network_1: { network: 1 },
    createdAt_1: { createdAt: 1 },
    compound_owner_status: { owner: 1, status: 1 },
    compound_type_status: { assetType: 1, status: 1 }
  }
};

// Asset Deployment Schema
const AssetDeploymentSchema = {
  className: 'AssetDeployment',
  fields: {
    asset: {
      type: 'Pointer',
      targetClass: 'DigitalAsset',
      required: true
    },
    network: {
      type: 'String',
      required: true
    },
    status: {
      type: 'String',
      defaultValue: 'pending'
      // Values: pending, deploying, completed, failed
    },
    
    // Deployment Configuration
    gasPrice: {
      type: 'Number'
    },
    gasLimit: {
      type: 'Number'
    },
    deploymentParams: {
      type: 'Object'
    },
    
    // Results
    contractAddress: {
      type: 'String'
    },
    transactionHash: {
      type: 'String'
    },
    blockNumber: {
      type: 'Number'
    },
    gasUsed: {
      type: 'Number'
    },
    
    // Timing
    startedAt: {
      type: 'Date'
    },
    completedAt: {
      type: 'Date'
    },
    
    // Error handling
    error: {
      type: 'String'
    },
    retryCount: {
      type: 'Number',
      defaultValue: 0
    },
    
    // User information
    deployedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    }
  },
  classLevelPermissions: {
    find: {
      'role:admin': true,
      'role:user': true
    },
    count: {
      'role:admin': true,
      'role:user': true
    },
    get: {
      'role:admin': true,
      'role:user': true
    },
    create: {
      'role:user': true,
      'role:admin': true
    },
    update: {
      'role:admin': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    asset_1: { asset: 1 },
    status_1: { status: 1 },
    network_1: { network: 1 },
    deployedBy_1: { deployedBy: 1 },
    createdAt_1: { createdAt: 1 },
    contractAddress_1: { contractAddress: 1 }
  }
};

// Asset Transaction Schema
const AssetTransactionSchema = {
  className: 'AssetTransaction',
  fields: {
    asset: {
      type: 'Pointer',
      targetClass: 'DigitalAsset',
      required: true
    },
    transactionType: {
      type: 'String',
      required: true
      // Values: mint, transfer, burn, approve, revoke
    },
    
    // Transaction Details
    from: {
      type: 'String' // User ID or address
    },
    to: {
      type: 'String' // User ID or address
    },
    amount: {
      type: 'Number',
      required: true
    },
    
    // Status and Timing
    status: {
      type: 'String',
      defaultValue: 'pending'
      // Values: pending, processing, completed, failed, cancelled
    },
    initiatedAt: {
      type: 'Date',
      defaultValue: new Date()
    },
    completedAt: {
      type: 'Date'
    },
    
    // Blockchain Information
    transactionHash: {
      type: 'String'
    },
    blockNumber: {
      type: 'Number'
    },
    gasUsed: {
      type: 'Number'
    },
    gasPrice: {
      type: 'Number'
    },
    
    // Additional Information
    reason: {
      type: 'String'
    },
    metadata: {
      type: 'Object'
    },
    
    // User and Approval
    initiatedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    approvedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    
    // Error handling
    error: {
      type: 'String'
    },
    retryCount: {
      type: 'Number',
      defaultValue: 0
    }
  },
  classLevelPermissions: {
    find: {
      '*': true
    },
    count: {
      '*': true
    },
    get: {
      '*': true
    },
    create: {
      'role:user': true,
      'role:admin': true
    },
    update: {
      'role:admin': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    asset_1: { asset: 1 },
    transactionType_1: { transactionType: 1 },
    status_1: { status: 1 },
    from_1: { from: 1 },
    to_1: { to: 1 },
    initiatedBy_1: { initiatedBy: 1 },
    createdAt_1: { createdAt: 1 },
    transactionHash_1: { transactionHash: 1 },
    compound_asset_type: { asset: 1, transactionType: 1 },
    compound_from_to: { from: 1, to: 1 }
  }
};

// Asset Holding Schema
const AssetHoldingSchema = {
  className: 'AssetHolding',
  fields: {
    holder: {
      type: 'String', // User ID or address
      required: true
    },
    asset: {
      type: 'Pointer',
      targetClass: 'DigitalAsset',
      required: true
    },
    
    // Balance Information
    balance: {
      type: 'Number',
      defaultValue: 0
    },
    lockedBalance: {
      type: 'Number',
      defaultValue: 0
    },
    availableBalance: {
      type: 'Number',
      defaultValue: 0
    },
    
    // Transaction History Totals
    totalReceived: {
      type: 'Number',
      defaultValue: 0
    },
    totalSent: {
      type: 'Number',
      defaultValue: 0
    },
    totalMinted: {
      type: 'Number',
      defaultValue: 0
    },
    totalBurned: {
      type: 'Number',
      defaultValue: 0
    },
    
    // Valuation
    estimatedValue: {
      type: 'Number',
      defaultValue: 0
    },
    costBasis: {
      type: 'Number',
      defaultValue: 0
    },
    
    // Timing
    firstAcquiredAt: {
      type: 'Date'
    },
    lastTransactionAt: {
      type: 'Date'
    },
    
    // Metadata
    metadata: {
      type: 'Object'
    }
  },
  classLevelPermissions: {
    find: {
      '*': true
    },
    count: {
      '*': true
    },
    get: {
      '*': true
    },
    create: {
      'role:user': true,
      'role:admin': true
    },
    update: {
      'role:admin': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    holder_1: { holder: 1 },
    asset_1: { asset: 1 },
    balance_1: { balance: 1 },
    lastTransactionAt_1: { lastTransactionAt: 1 },
    compound_holder_asset: { holder: 1, asset: 1 },
    compound_asset_balance: { asset: 1, balance: 1 }
  }
};

// Asset Permission Schema
const AssetPermissionSchema = {
  className: 'AssetPermission',
  fields: {
    asset: {
      type: 'Pointer',
      targetClass: 'DigitalAsset',
      required: true
    },
    user: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    permission: {
      type: 'String',
      required: true
      // Values: mint, burn, transfer, pause, admin
    },
    
    // Permission Details
    isActive: {
      type: 'Boolean',
      defaultValue: true
    },
    expiresAt: {
      type: 'Date'
    },
    
    // Limits and Constraints
    dailyLimit: {
      type: 'Number'
    },
    totalLimit: {
      type: 'Number'
    },
    usedAmount: {
      type: 'Number',
      defaultValue: 0
    },
    
    // Granting Information
    grantedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    grantedAt: {
      type: 'Date',
      defaultValue: new Date()
    },
    reason: {
      type: 'String'
    },
    
    // Revocation
    revokedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    revokedAt: {
      type: 'Date'
    },
    revocationReason: {
      type: 'String'
    }
  },
  classLevelPermissions: {
    find: {
      'role:admin': true
    },
    count: {
      'role:admin': true
    },
    get: {
      'role:admin': true
    },
    create: {
      'role:admin': true
    },
    update: {
      'role:admin': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    asset_1: { asset: 1 },
    user_1: { user: 1 },
    permission_1: { permission: 1 },
    isActive_1: { isActive: 1 },
    expiresAt_1: { expiresAt: 1 },
    compound_asset_user: { asset: 1, user: 1 },
    compound_user_permission: { user: 1, permission: 1 }
  }
};

// Asset Marketplace Listing Schema
const AssetMarketplaceListingSchema = {
  className: 'AssetMarketplaceListing',
  fields: {
    asset: {
      type: 'Pointer',
      targetClass: 'DigitalAsset',
      required: true
    },
    seller: {
      type: 'String', // User ID or address
      required: true
    },
    
    // Listing Details
    listingType: {
      type: 'String',
      required: true
      // Values: fixed_price, auction, dutch_auction
    },
    price: {
      type: 'Number',
      required: true
    },
    currency: {
      type: 'String',
      defaultValue: 'ETH'
    },
    quantity: {
      type: 'Number',
      required: true
    },
    
    // Status and Timing
    status: {
      type: 'String',
      defaultValue: 'active'
      // Values: active, sold, cancelled, expired
    },
    listedAt: {
      type: 'Date',
      defaultValue: new Date()
    },
    expiresAt: {
      type: 'Date'
    },
    soldAt: {
      type: 'Date'
    },
    
    // Auction Specific (if applicable)
    startingPrice: {
      type: 'Number'
    },
    reservePrice: {
      type: 'Number'
    },
    currentBid: {
      type: 'Number'
    },
    bidCount: {
      type: 'Number',
      defaultValue: 0
    },
    
    // Sale Information
    buyer: {
      type: 'String' // User ID or address
    },
    finalPrice: {
      type: 'Number'
    },
    
    // Metadata
    description: {
      type: 'String'
    },
    metadata: {
      type: 'Object'
    }
  },
  classLevelPermissions: {
    find: {
      '*': true
    },
    count: {
      '*': true
    },
    get: {
      '*': true
    },
    create: {
      'role:user': true,
      'role:admin': true
    },
    update: {
      'role:admin': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    asset_1: { asset: 1 },
    seller_1: { seller: 1 },
    status_1: { status: 1 },
    listingType_1: { listingType: 1 },
    price_1: { price: 1 },
    listedAt_1: { listedAt: 1 },
    expiresAt_1: { expiresAt: 1 },
    compound_asset_status: { asset: 1, status: 1 },
    compound_status_price: { status: 1, price: 1 }
  }
};

// Export schemas for deployment
module.exports = {
  DigitalAssetSchema,
  AssetDeploymentSchema,
  AssetTransactionSchema,
  AssetHoldingSchema,
  AssetPermissionSchema,
  AssetMarketplaceListingSchema
};

// Schema deployment function
async function deployAssetSchemas() {
  const schemas = [
    DigitalAssetSchema,
    AssetDeploymentSchema,
    AssetTransactionSchema,
    AssetHoldingSchema,
    AssetPermissionSchema,
    AssetMarketplaceListingSchema
  ];
  
  for (const schema of schemas) {
    try {
      console.log(`Deploying schema: ${schema.className}`);
      
      // Create or update schema
      const parseSchema = new Parse.Schema(schema.className);
      
      // Add fields
      for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
        if (fieldConfig.type === 'Pointer') {
          parseSchema.addPointer(fieldName, fieldConfig.targetClass);
        } else if (fieldConfig.type === 'Relation') {
          parseSchema.addRelation(fieldName, fieldConfig.targetClass);
        } else if (fieldConfig.type === 'Array') {
          parseSchema.addArray(fieldName);
        } else if (fieldConfig.type === 'Object') {
          parseSchema.addObject(fieldName);
        } else if (fieldConfig.type === 'File') {
          parseSchema.addFile(fieldName);
        } else if (fieldConfig.type === 'GeoPoint') {
          parseSchema.addGeoPoint(fieldName);
        } else if (fieldConfig.type === 'Date') {
          parseSchema.addDate(fieldName);
        } else if (fieldConfig.type === 'Boolean') {
          parseSchema.addBoolean(fieldName);
        } else if (fieldConfig.type === 'Number') {
          parseSchema.addNumber(fieldName);
        } else {
          parseSchema.addString(fieldName);
        }
      }
      
      // Set class level permissions
      if (schema.classLevelPermissions) {
        parseSchema.setCLP(schema.classLevelPermissions);
      }
      
      // Save schema
      await parseSchema.save();
      
      // Add indexes
      if (schema.indexes) {
        for (const [indexName, indexSpec] of Object.entries(schema.indexes)) {
          try {
            await parseSchema.addIndex(indexName, indexSpec);
          } catch (indexError) {
            console.warn(`Index ${indexName} may already exist:`, indexError.message);
          }
        }
      }
      
      console.log(`✅ Schema deployed successfully: ${schema.className}`);
      
    } catch (error) {
      console.error(`❌ Error deploying schema ${schema.className}:`, error);
    }
  }
}

// Export deployment function
module.exports.deployAssetSchemas = deployAssetSchemas;