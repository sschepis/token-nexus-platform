/**
 * Schema definition for PlatformConfig
 * This class stores global configuration related to the platform's setup state.
 */

const PlatformConfig = {
  className: 'PlatformConfig',
  fields: {
    // Current state of the platform (e.g., PRISTINE, CORE_ARTIFACTS_IMPORTED, OPERATIONAL)
    currentState: {
      type: 'String',
      required: true,
      defaultValue: 'PRISTINE', // Initial state
    },
    // Optional: stores the network for which core contracts were imported
    coreContractsImportedForNetwork: {
      type: 'String',
      required: false,
    },
    // Optional: stores the ID of the parent organization created during setup
    parentOrgId: {
      type: 'String',
      required: false,
    },
    // Timestamp of the last status update
    lastUpdated: {
      type: 'Date',
      required: false, // Not strictly required, will be set by Parse automatically as updatedAt
    },
    // Any error messages or details related to an 'ERROR' state
    errorMessage: {
      type: 'String',
      required: false,
    },
  },
  classLevelPermissions: {
    // Only allow master key or authenticated system admins to write/update
    find: { "*": true }, // Allow all authenticated users to read
    get: { "*": true },
    create: { "*": false }, // Only master key can create (handled by cloud functions)
    update: { "*": false }, // Only master key can update (handled by cloud functions)
    delete: { "*": false }, // Only master key can delete
  },
  // Indexes for frequently queried fields
  indexes: {
    currentState: {
      currentState: 1,
    },
  },
};

module.exports = PlatformConfig;