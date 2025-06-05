module.exports = Parse => {
  // Cloud functions for managing custom objects and their schemas

  Parse.Cloud.define('getAvailableObjects', async (request) => {
    const { organizationId } = request.params;

    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    try {
      const schemas = await Parse.Schema.all();
      const customObjects = [];

      for (const schema of schemas) {
        if (!schema.className.startsWith('_')) {
          const fields = [];
          for (const fieldName in schema.fields) {
            const field = schema.fields[fieldName];
            fields.push({
              id: `${schema.className}-${fieldName}`,
              apiName: fieldName,
              label: fieldName,
              type: field.type,
              required: field.required || false,
            });
          }

          customObjects.push({
            id: schema.className,
            apiName: schema.className,
            label: schema.className,
            description: `Schema for ${schema.className}`,
            fields: fields,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return { success: true, objects: customObjects };
    } catch (error) {
      console.error('Error in getAvailableObjects:', error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fetch custom objects: ${error.message}`);
    }
  });

  // Moved Parse.Cloud.define('fetchObjectsByClassName') to top-level
  Parse.Cloud.define('fetchObjectsByClassName', async (request) => {
    const { className, organizationId, searchFilters = {} } = request.params;

    if (!className) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'Class name is required.');
    }
    if (!request.user && !request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Not Authorized: Authentication required or master key.');
    }

    try {
      const query = new Parse.Query(className);

      for (const key in searchFilters) {
        if (typeof searchFilters[key] === 'string') {
          query.matches(key, searchFilters[key], 'i');
        } else {
          query.equalTo(key, searchFilters[key]);
        }
      }

      const schema = await new Parse.Schema(className).get({ useMasterKey: true });
      if (schema.fields && schema.fields.organization && schema.fields.organization.type === 'Pointer' && schema.fields.organization.targetClass === 'Organization') {
        if (organizationId) {
          const orgPointer = Parse.Object.extend('Organization').createWithoutData(organizationId);
          query.equalTo('organization', orgPointer);
        }
      }

      const results = await query.find({ useMasterKey: true });

      const plainResults = results.map(obj => {
        const json = obj.toJSON();
        json.id = obj.id;
        return json;
      });

      return { success: true, records: plainResults };
    } catch (error) {
      console.error(`Error fetching objects for class ${className}:`, error);
      throw new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, `Failed to fetch records: ${error.message}`);
    }
  });

  // Note: any other helper functions or exports would go here
};