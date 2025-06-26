// Smart Contract Studio initialization

/**
 * Initialize Smart Contract Studio schemas and data
 * Sets up required schemas and seeds initial facet registry
 */
Parse.Cloud.define('initializeSmartContractStudio', async (request) => {
  // Require master key
  if (!request.master) {
    throw new Error('Master key required');
  }

  try {
    // Import the Smart Contract Studio schema functions
    const { initializeSmartContractStudioSchemas, seedFacetRegistry } = require('../schemas/smartContractStudio');
    
    console.log('Initializing Smart Contract Studio schemas...');
    await initializeSmartContractStudioSchemas();
    
    console.log('Seeding facet registry...');
    await seedFacetRegistry();
    
    console.log('Smart Contract Studio initialization completed successfully');
    
    return {
      success: true,
      message: 'Smart Contract Studio initialized successfully'
    };
    
  } catch (error) {
    console.error('Smart Contract Studio initialization error:', error);
    throw error;
  }
});

module.exports = {};