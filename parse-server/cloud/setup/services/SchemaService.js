/**
 * Schema Service - Handles schema creation and management
 */

class SchemaService {
  /**
   * Create or update schemas
   * @param {Array} schemas - Array of schema definitions
   * @returns {Promise<Object>} Results of schema operations
   */
  static async ensureSchemas(schemas) {
    const results = { schemas: [] };
    
    for (const schemaDef of schemas) {
      try {
        let schema = new Parse.Schema(schemaDef.className);
        await schema.get({ useMasterKey: true });
        results.schemas.push({ name: schemaDef.className, status: 'existed' });
      } catch (error) {
        if (error.code === Parse.Error.INVALID_CLASS_NAME || error.message.includes('Schema not found')) {
          try {
            console.log(`Schema ${schemaDef.className} not found, creating...`);
            schema = new Parse.Schema(schemaDef.className);
            
            // Add fields
            for (const [fieldName, fieldDef] of Object.entries(schemaDef.fields)) {
              await this.addField(schema, fieldName, fieldDef);
            }
            
            // Set class level permissions
            if (schemaDef.classLevelPermissions) {
              const clp = new Parse.CLP(schemaDef.classLevelPermissions);
              schema.setCLP(clp);
            }
            
            // Add indexes if defined
            if (schemaDef.indexes) {
              for (const [indexName, indexDef] of Object.entries(schemaDef.indexes)) {
                schema.addIndex(indexName, indexDef);
              }
            }
            
            await schema.save({ useMasterKey: true });
            results.schemas.push({ name: schemaDef.className, status: 'created' });
          } catch (creationError) {
            console.error(`Error creating schema ${schemaDef.className}:`, creationError);
            results.schemas.push({ 
              name: schemaDef.className, 
              status: 'failed_creation', 
              error: creationError.message 
            });
          }
        } else {
          console.error(`Error getting schema ${schemaDef.className}:`, error);
          results.schemas.push({ 
            name: schemaDef.className, 
            status: 'failed_check', 
            error: error.message 
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Add a field to a schema
   * @param {Parse.Schema} schema - The schema object
   * @param {string} fieldName - Name of the field
   * @param {Object} fieldDef - Field definition
   */
  static async addField(schema, fieldName, fieldDef) {
    const options = { 
      defaultValue: fieldDef.defaultValue, 
      required: !!fieldDef.required 
    };
    
    if (fieldDef.type === 'Pointer') {
      schema.addPointer(fieldName, fieldDef.targetClass, options);
    } else if (fieldDef.type === 'Relation') {
      schema.addRelation(fieldName, fieldDef.targetClass);
    } else {
      schema.addField(fieldName, fieldDef.type, options);
    }
  }
}

module.exports = SchemaService;