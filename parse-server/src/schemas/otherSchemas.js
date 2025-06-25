/**
 * Other schema definitions extracted from the original schema.js
 * TODO: These should be moved to individual files for better maintainability
 */

function getOtherSchemas(baseSchema, basePermissions) {
  return [
    {
      className: 'EVMEvent',
      fields: {
        ...baseSchema, // Includes createdBy, updatedBy, organization, status, metadata
        chainId: { type: 'Number', required: true },
        blockNumber: { type: 'Number', required: true },
        blockTimestamp: { type: 'Date', required: true },
        transactionHash: { type: 'String', required: true },
        logIndex: { type: 'Number', required: true },
        contractAddress: { type: 'String', required: true },
        eventName: { type: 'String', required: true },
        eventData: { type: 'Object', required: true },
      },
      indexes: {
        uniqueEventIndex: { chainId: 1, transactionHash: 1, logIndex: 1 }, // Unique compound index
        contractAddressIndex: { contractAddress: 1 },
        eventNameIndex: { eventName: 1 },
        blockTimestampIndex: { blockTimestamp: -1 }
      },
      classLevelPermissions: basePermissions,
    },
    {
      className: 'User',
      fields: {
        walletAddress: {
          type: 'String',
        },
        walletPreference: {
          type: 'String',
        },
        walletId: {
          type: 'String',
        },
        isSystemAdmin: { // New field for system administrators
          type: 'Boolean',
          defaultValue: false,
        },
      },
    },
    // TODO: Add remaining schemas from original schema.js
    // For now, we'll focus on the core schemas needed to fix the permission issues
  ];
}

module.exports = { getOtherSchemas };