/**
 * Identity Management Parse Schemas
 * Database schema definitions for the Identity Management standard application
 */

// Identity Schema
const IdentitySchema = {
  className: 'Identity',
  fields: {
    // Basic Information
    user: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    firstName: {
      type: 'String',
      required: true
    },
    lastName: {
      type: 'String',
      required: true
    },
    email: {
      type: 'String',
      required: true
    },
    dateOfBirth: {
      type: 'Date',
      required: true
    },
    nationality: {
      type: 'String',
      required: true
    },
    phoneNumber: {
      type: 'String'
    },
    
    // Document Information
    documentType: {
      type: 'String' // passport, national_id, drivers_license, residence_permit
    },
    documentNumber: {
      type: 'String'
    },
    issuingCountry: {
      type: 'String'
    },
    expiryDate: {
      type: 'Date'
    },
    
    // Address Information
    address: {
      type: 'Object' // { street, city, country, postalCode }
    },
    
    // Professional Information
    occupation: {
      type: 'String'
    },
    sourceOfFunds: {
      type: 'String'
    },
    
    // Verification Status
    status: {
      type: 'String',
      required: true,
      defaultValue: 'pending_verification'
      // Values: pending_verification, verification_in_progress, verified, rejected, suspended
    },
    verificationLevel: {
      type: 'String',
      defaultValue: 'none'
      // Values: none, basic, enhanced, premium
    },
    verifiedAt: {
      type: 'Date'
    },
    verifiedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    
    // Current verification reference
    currentVerification: {
      type: 'Pointer',
      targetClass: 'IdentityVerification'
    },
    
    // Metadata
    createdBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    lastModifiedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    lastModifiedAt: {
      type: 'Date'
    },
    
    // Compliance flags
    isBlacklisted: {
      type: 'Boolean',
      defaultValue: false
    },
    riskScore: {
      type: 'Number',
      defaultValue: 0
    },
    complianceNotes: {
      type: 'String'
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
      'role:admin': true,
      'role:verifier': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    },
    protectedFields: {
      '*': ['documentNumber', 'riskScore', 'complianceNotes']
    }
  },
  indexes: {
    user_1: { user: 1 },
    email_1: { email: 1 },
    status_1: { status: 1 },
    verificationLevel_1: { verificationLevel: 1 },
    createdAt_1: { createdAt: 1 },
    compound_user_status: { user: 1, status: 1 }
  }
};

// Identity Verification Schema
const IdentityVerificationSchema = {
  className: 'IdentityVerification',
  fields: {
    identity: {
      type: 'Pointer',
      targetClass: 'Identity',
      required: true
    },
    status: {
      type: 'String',
      required: true,
      defaultValue: 'pending'
      // Values: pending, in_review, approved, rejected, expired
    },
    verificationType: {
      type: 'String',
      required: true
      // Values: document_review, biometric_check, address_verification, enhanced_due_diligence
    },
    priority: {
      type: 'String',
      defaultValue: 'normal'
      // Values: low, normal, high, urgent
    },
    
    // Review Information
    reviewedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    reviewedAt: {
      type: 'Date'
    },
    reviewNotes: {
      type: 'String'
    },
    verificationLevel: {
      type: 'String'
      // Values: basic, enhanced, premium
    },
    
    // Verification Details
    documentsRequired: {
      type: 'Array'
    },
    documentsProvided: {
      type: 'Array'
    },
    verificationScore: {
      type: 'Number'
    },
    
    // Workflow
    initiatedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    assignedTo: {
      type: 'Pointer',
      targetClass: '_User'
    },
    dueDate: {
      type: 'Date'
    },
    expiredAt: {
      type: 'Date'
    },
    
    // External verification references
    externalVerificationId: {
      type: 'String'
    },
    externalProvider: {
      type: 'String'
    },
    externalResponse: {
      type: 'Object'
    }
  },
  classLevelPermissions: {
    find: {
      'role:admin': true,
      'role:verifier': true
    },
    count: {
      'role:admin': true,
      'role:verifier': true
    },
    get: {
      'role:admin': true,
      'role:verifier': true
    },
    create: {
      'role:user': true,
      'role:admin': true,
      'role:verifier': true
    },
    update: {
      'role:admin': true,
      'role:verifier': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    identity_1: { identity: 1 },
    status_1: { status: 1 },
    priority_1: { priority: 1 },
    assignedTo_1: { assignedTo: 1 },
    createdAt_1: { createdAt: 1 },
    compound_status_priority: { status: 1, priority: 1 }
  }
};

// Verification Document Schema
const VerificationDocumentSchema = {
  className: 'VerificationDocument',
  fields: {
    identity: {
      type: 'Pointer',
      targetClass: 'Identity',
      required: true
    },
    verification: {
      type: 'Pointer',
      targetClass: 'IdentityVerification'
    },
    documentType: {
      type: 'String',
      required: true
      // Values: passport, national_id, drivers_license, utility_bill, bank_statement, etc.
    },
    documentCategory: {
      type: 'String',
      required: true
      // Values: identity, address, income, other
    },
    
    // File Information
    file: {
      type: 'File',
      required: true
    },
    fileName: {
      type: 'String',
      required: true
    },
    fileSize: {
      type: 'Number'
    },
    mimeType: {
      type: 'String'
    },
    
    // Document Details
    documentNumber: {
      type: 'String'
    },
    issuingAuthority: {
      type: 'String'
    },
    issueDate: {
      type: 'Date'
    },
    expiryDate: {
      type: 'Date'
    },
    
    // Verification Status
    status: {
      type: 'String',
      defaultValue: 'uploaded'
      // Values: uploaded, processing, verified, rejected, expired
    },
    verificationScore: {
      type: 'Number'
    },
    verificationNotes: {
      type: 'String'
    },
    
    // Processing Information
    processedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    processedAt: {
      type: 'Date'
    },
    
    // OCR and Analysis Results
    ocrData: {
      type: 'Object'
    },
    analysisResults: {
      type: 'Object'
    },
    
    // External verification
    externalVerificationId: {
      type: 'String'
    },
    externalProvider: {
      type: 'String'
    },
    
    // Metadata
    uploadedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    }
  },
  classLevelPermissions: {
    find: {
      'role:admin': true,
      'role:verifier': true
    },
    count: {
      'role:admin': true,
      'role:verifier': true
    },
    get: {
      'role:admin': true,
      'role:verifier': true
    },
    create: {
      'role:user': true,
      'role:admin': true
    },
    update: {
      'role:admin': true,
      'role:verifier': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    },
    protectedFields: {
      '*': ['ocrData', 'analysisResults', 'verificationScore']
    }
  },
  indexes: {
    identity_1: { identity: 1 },
    verification_1: { verification: 1 },
    status_1: { status: 1 },
    documentType_1: { documentType: 1 },
    createdAt_1: { createdAt: 1 }
  }
};

// Verifiable Credential Schema
const VerifiableCredentialSchema = {
  className: 'VerifiableCredential',
  fields: {
    identity: {
      type: 'Pointer',
      targetClass: 'Identity',
      required: true
    },
    credentialType: {
      type: 'String',
      required: true
      // Values: identity_verification, address_verification, income_verification, etc.
    },
    credentialSubject: {
      type: 'Object',
      required: true
    },
    
    // Credential Information
    issuer: {
      type: 'String',
      required: true
    },
    issuanceDate: {
      type: 'Date',
      required: true
    },
    expirationDate: {
      type: 'Date'
    },
    
    // Credential Data
    claims: {
      type: 'Object',
      required: true
    },
    proof: {
      type: 'Object'
    },
    
    // Status
    status: {
      type: 'String',
      defaultValue: 'active'
      // Values: active, revoked, expired, suspended
    },
    revokedAt: {
      type: 'Date'
    },
    revokedBy: {
      type: 'Pointer',
      targetClass: '_User'
    },
    revocationReason: {
      type: 'String'
    },
    
    // Blockchain Information
    blockchainTxHash: {
      type: 'String'
    },
    blockchainNetwork: {
      type: 'String'
    },
    contractAddress: {
      type: 'String'
    },
    tokenId: {
      type: 'String'
    },
    
    // Metadata
    issuedBy: {
      type: 'Pointer',
      targetClass: '_User',
      required: true
    },
    verificationLevel: {
      type: 'String'
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
      'role:admin': true,
      'role:issuer': true
    },
    update: {
      'role:admin': true,
      'role:issuer': true
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    identity_1: { identity: 1 },
    credentialType_1: { credentialType: 1 },
    status_1: { status: 1 },
    issuer_1: { issuer: 1 },
    issuanceDate_1: { issuanceDate: 1 },
    expirationDate_1: { expirationDate: 1 }
  }
};

// Audit Log Schema
const AuditLogSchema = {
  className: 'AuditLog',
  fields: {
    action: {
      type: 'String',
      required: true
    },
    entityType: {
      type: 'String',
      required: true
    },
    entityId: {
      type: 'String',
      required: true
    },
    userId: {
      type: 'String',
      required: true
    },
    details: {
      type: 'Object'
    },
    timestamp: {
      type: 'Date',
      required: true
    },
    ipAddress: {
      type: 'String'
    },
    userAgent: {
      type: 'String'
    },
    sessionId: {
      type: 'String'
    }
  },
  classLevelPermissions: {
    find: {
      'role:admin': true,
      'role:auditor': true
    },
    count: {
      'role:admin': true,
      'role:auditor': true
    },
    get: {
      'role:admin': true,
      'role:auditor': true
    },
    create: {
      '*': true
    },
    update: {
      // Audit logs should be immutable
    },
    delete: {
      'role:admin': true
    },
    addField: {
      'role:admin': true
    }
  },
  indexes: {
    action_1: { action: 1 },
    entityType_1: { entityType: 1 },
    entityId_1: { entityId: 1 },
    userId_1: { userId: 1 },
    timestamp_1: { timestamp: 1 },
    compound_entity: { entityType: 1, entityId: 1 },
    compound_user_timestamp: { userId: 1, timestamp: 1 }
  }
};

// Export schemas for deployment
module.exports = {
  IdentitySchema,
  IdentityVerificationSchema,
  VerificationDocumentSchema,
  VerifiableCredentialSchema,
  AuditLogSchema
};

// Schema deployment function
async function deployIdentitySchemas() {
  const schemas = [
    IdentitySchema,
    IdentityVerificationSchema,
    VerificationDocumentSchema,
    VerifiableCredentialSchema,
    AuditLogSchema
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
module.exports.deployIdentitySchemas = deployIdentitySchemas;