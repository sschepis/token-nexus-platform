/* global Parse */

const executeAPI = async request => {
  const { endpoint } = request.params;

  if (!endpoint) {
    throw new Error('Endpoint is required');
  }

  const query = new Parse.Query('CMSAPIEndpoint');
  const apiEndpoint = await query.get(endpoint);

  if (!apiEndpoint) {
    throw new Error('API endpoint not found');
  }

  const code = apiEndpoint.get('code');

  if (!code) {
    throw new Error('API code not found');
  }

  try {
    // Create a safe context for executing the API code
    const context = {
      request: request,
      response: {},
      Parse: Parse,
      console: console,
    };

    // Execute the API code in the context
    const fn = new Function(
      'context',
      `
      with (context) {
        ${code}
      }
      return response;
    `
    );

    const result = await fn(context);

    return result;
  } catch (error) {
    throw new Error(`API execution failed: ${error.message}`);
  }
};

Parse.Cloud.define('executeAPI', executeAPI);
