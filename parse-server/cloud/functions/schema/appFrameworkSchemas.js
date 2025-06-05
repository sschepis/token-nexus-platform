// App Framework Schema Initialization
const appFrameworkAdvancedSchemas = require('../../schemas/appFrameworkAdvanced');

// Initialize all app framework schemas
Parse.Cloud.define('initializeAppFrameworkSchemas', async (request) => {
  const { user } = request;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can initialize schemas');
  }

  try {
    const results = [];
    
    // Get all schema definitions
    const schemas = Object.values(appFrameworkAdvancedSchemas);
    
    for (const schemaConfig of schemas) {
      try {
        const schema = new Parse.Schema(schemaConfig.className);
        
        // Add fields
        Object.entries(schemaConfig.fields).forEach(([fieldName, fieldConfig]) => {
          if (fieldConfig.type === 'String') {
            schema.addString(fieldName, fieldConfig.required);
          } else if (fieldConfig.type === 'Number') {
            schema.addNumber(fieldName, fieldConfig.required);
          } else if (fieldConfig.type === 'Boolean') {
            schema.addBoolean(fieldName, fieldConfig.required);
          } else if (fieldConfig.type === 'Date') {
            schema.addDate(fieldName, fieldConfig.required);
          } else if (fieldConfig.type === 'Object') {
            schema.addObject(fieldName, fieldConfig.required);
          } else if (fieldConfig.type === 'Array') {
            schema.addArray(fieldName, fieldConfig.required);
          } else if (fieldConfig.type === 'Pointer') {
            schema.addPointer(fieldName, fieldConfig.targetClass, fieldConfig.required);
          }
          
          // Set default values
          if (fieldConfig.defaultValue !== undefined) {
            schema.addField(fieldName, fieldConfig.type, {
              defaultValue: fieldConfig.defaultValue
            });
          }
        });
        
        // Add indexes
        if (schemaConfig.indexes) {
          Object.entries(schemaConfig.indexes).forEach(([indexName, indexConfig]) => {
            schema.addIndex(indexName, indexConfig);
          });
        }
        
        // Set class level permissions
        if (schemaConfig.classLevelPermissions) {
          Object.entries(schemaConfig.classLevelPermissions).forEach(([operation, permission]) => {
            schema.setCLP(operation, permission);
          });
        }
        
        // Save or update the schema
        await schema.save({ useMasterKey: true });
        
        results.push({
          className: schemaConfig.className,
          status: 'success',
          message: 'Schema created/updated successfully'
        });
        
      } catch (error) {
        console.error(`Error creating schema ${schemaConfig.className}:`, error);
        results.push({
          className: schemaConfig.className,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      success: true,
      message: 'App framework schemas initialization completed',
      results: results
    };
    
  } catch (error) {
    console.error('Schema initialization error:', error);
    throw error;
  }
});

// Get schema status for all app framework schemas
Parse.Cloud.define('getAppFrameworkSchemaStatus', async (request) => {
  const { user } = request;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can view schema status');
  }

  try {
    const results = [];
    const schemas = Object.values(appFrameworkAdvancedSchemas);
    
    for (const schemaConfig of schemas) {
      try {
        const schema = await Parse.Schema.get(schemaConfig.className, { useMasterKey: true });
        results.push({
          className: schemaConfig.className,
          exists: true,
          fields: Object.keys(schema.fields || {}),
          indexes: Object.keys(schema.indexes || {}),
          clp: schema.classLevelPermissions || {}
        });
      } catch (error) {
        results.push({
          className: schemaConfig.className,
          exists: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      schemas: results
    };
    
  } catch (error) {
    console.error('Schema status error:', error);
    throw error;
  }
});

// Drop all app framework schemas (for development/testing)
Parse.Cloud.define('dropAppFrameworkSchemas', async (request) => {
  const { user } = request;
  const { confirm } = request.params;
  
  if (!user || !user.get('isSystemAdmin')) {
    throw new Error('Only system administrators can drop schemas');
  }
  
  if (confirm !== 'YES_DELETE_ALL_SCHEMAS') {
    throw new Error('Confirmation required: pass confirm: "YES_DELETE_ALL_SCHEMAS"');
  }

  try {
    const results = [];
    const schemas = Object.values(appFrameworkAdvancedSchemas);
    
    for (const schemaConfig of schemas) {
      try {
        await Parse.Schema.delete(schemaConfig.className, { useMasterKey: true });
        results.push({
          className: schemaConfig.className,
          status: 'deleted'
        });
      } catch (error) {
        results.push({
          className: schemaConfig.className,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      success: true,
      message: 'App framework schemas deletion completed',
      results: results
    };
    
  } catch (error) {
    console.error('Schema deletion error:', error);
    throw error;
  }
});

module.exports = {};