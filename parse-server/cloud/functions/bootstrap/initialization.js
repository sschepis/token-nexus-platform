/* eslint-disable require-await */
/* eslint-disable no-console */
/* global Parse */

/**
 * Initialize the Parse Server application
 * This function is called when the server starts up
 */
async function initialize() {
  try {
    console.log('Starting server initialization...');

    // Initialize services
    const ServiceManager = require('../../../src/services/ServiceManager');
    const config = require('../../../src/config');

    console.log('Initializing services...');
    await ServiceManager.initialize(config);
    console.log('Services initialized successfully');

    // Basic initialization successful
    return {
      status: 'success',
      message: 'Server initialized successfully',
    };
  } catch (error) {
    console.error('Initialization error:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to initialize server');
  }
}

/**
 * Create an example API for demonstration
 */
async function createExampleAPI() {
  try {
    console.log('Creating example API...');

    return {
      status: 'success',
      message: 'Example API created successfully',
    };
  } catch (error) {
    console.error('Error creating example API:', error);
    throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, 'Failed to create example API');
  }
}

// Register cloud functions
Parse.Cloud.define('initialize', initialize);
Parse.Cloud.define('createExampleAPI', createExampleAPI);

module.exports = {
  initialize,
  createExampleAPI,
};
