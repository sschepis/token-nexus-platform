/* eslint-disable no-console */
const Parse = require('parse/node');
const aiSchema = require('./aiSchema');
const applicationSchema = require('./applicationSchema');
const UserSchema = require('./UserSchema'); // Import the new UserSchema
const OrganizationSchema = require('./Organization'); // Import OrganizationSchema if not already loaded elsewhere
const OrgIntegrationConfigSchema = require('./OrgIntegrationConfig'); // Import OrgIntegrationConfigSchema if needed
const PlatformConfigSchema = require('./PlatformConfig'); // Import PlatformConfigSchema
const AppFrameworkSchema = require('./AppFramework'); // Import AppFrameworkSchema
const { WorkflowSchema, WorkflowExecutionSchema, NodeExecutionSchema, WorkflowTemplateSchema } = require('./workflowSchema');
const ErrorFormatter = require('../utils/errorFormatter');

async function initializeSchema(schemaDefinitions, options = {}) {
  const { verbose = false } = options;
  
  // Ensure Parse is initialized with master key
  if (!Parse.applicationId) {
    const config = require('../../src/config');
    Parse.initialize(config.parseServer.appId, null, config.parseServer.masterKey);
    Parse.serverURL = config.parseServer.serverURL;
  }

  const schemaNames = Object.keys(schemaDefinitions);
  const progress = ErrorFormatter.createProgressLogger(schemaNames.length);
  const results = {
    success: [],
    skipped: [],
    failed: [],
  };

  progress.start();

  for (const [className, config] of Object.entries(schemaDefinitions)) {
    try {
      // Create or update the class
      const schema = new Parse.Schema(className);

      // Add fields
      for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
        switch (fieldConfig.type) {
          case 'String':
            schema.addString(fieldName, {
              required: fieldConfig.required,
              defaultValue: fieldConfig.defaultValue,
            });
            break;
          case 'Number':
            schema.addNumber(fieldName, {
              required: fieldConfig.required,
              defaultValue: fieldConfig.defaultValue,
            });
            break;
          case 'Boolean':
            schema.addBoolean(fieldName, {
              required: fieldConfig.required,
              defaultValue: fieldConfig.defaultValue,
            });
            break;
          case 'Date':
            schema.addDate(fieldName, {
              required: fieldConfig.required,
              defaultValue: fieldConfig.defaultValue,
            });
            break;
          case 'Array':
            schema.addArray(fieldName, {
              required: fieldConfig.required,
            });
            break;
          case 'Pointer':
            schema.addPointer(fieldName, fieldConfig.targetClass, {
              required: fieldConfig.required,
            });
            break;
          case 'Object':
            schema.addObject(fieldName, {
              required: fieldConfig.required,
              defaultValue: fieldConfig.defaultValue,
            });
            break;
          default:
            if (verbose) {
              console.warn(`Unknown field type: ${fieldConfig.type} for field ${fieldName} in class ${className}`);
            }
        }
      }

      // Add indexes
      if (config.indexes) {
        for (const [indexName, indexConfig] of Object.entries(config.indexes)) {
          schema.addIndex(indexName, indexConfig);
        }
      }

      // Set permissions
      if (config.classLevelPermissions) {
        schema.setCLP(config.classLevelPermissions);
      }

      try {
        // Try to create new schema with master key
        await schema.save({ useMasterKey: true });
        results.success.push(className);
        progress.progress(className, 'success');
      } catch (error) {
        const formattedError = ErrorFormatter.formatSchemaError(error, className);
        
        if (error.code === 103) {
          // Class already exists, attempt to update
          try {
            await schema.update({ useMasterKey: true });
            results.success.push(className);
            progress.progress(className, 'success');
          } catch (updateError) {
            const updateFormattedError = ErrorFormatter.formatSchemaError(updateError, className);
            
            if (updateFormattedError.isBenign || updateError.code === 102) { // 102 is 'Index already exists'
              results.skipped.push(className);
              progress.progress(className, 'skipped');
              
              if (verbose) {
                ErrorFormatter.logError(updateFormattedError, { verbose, prefix: '[Schema Update]' });
              }
            } else {
              results.failed.push(className);
              progress.progress(className, 'failed');
              ErrorFormatter.logError(updateFormattedError, { verbose, prefix: '[Schema Update]' });
              throw updateError;
            }
          }
        } else if (formattedError.isBenign || error.code === 103) { // 103 is 'Class already exists'
          results.skipped.push(className);
          progress.progress(className, 'skipped');
          
          if (verbose) {
            ErrorFormatter.logError(formattedError, { verbose, prefix: '[Schema]' });
          }
        } else {
          results.failed.push(className);
          progress.progress(className, 'failed');
          ErrorFormatter.logError(formattedError, { verbose, prefix: '[Schema]' });
          throw error;
        }
      }
    } catch (error) {
      if (!results.failed.includes(className)) {
        results.failed.push(className);
        progress.progress(className, 'failed');
        
        const formattedError = ErrorFormatter.formatSchemaError(error, className);
        ErrorFormatter.logError(formattedError, { verbose: true, prefix: '[Schema]' });
      }
      
      // Don't throw here to continue with other schemas
      if (verbose) {
        console.error(`Continuing after error in ${className}...`);
      }
    }
  }

  progress.complete(results.success.length, results.skipped.length, results.failed.length);
  
  return results;
}

async function initializeAISchemas(options = {}) {
  const results = await initializeSchema(aiSchema, options);
  
  if (results.failed.length > 0) {
    throw new Error(`Failed to initialize ${results.failed.length} AI schemas: ${results.failed.join(', ')}`);
  }
  
  return results;
}

async function initializeApplicationSchemas(options = {}) {
  const results = await initializeSchema(applicationSchema, options);
  
  if (results.failed.length > 0) {
    throw new Error(`Failed to initialize ${results.failed.length} application schemas: ${results.failed.join(', ')}`);
  }
  
  return results;
}

async function initializeWorkflowSchemas(options = {}) {
  const workflowSchemas = {
    Workflow: WorkflowSchema,
    WorkflowExecution: WorkflowExecutionSchema,
    NodeExecution: NodeExecutionSchema,
    WorkflowTemplate: WorkflowTemplateSchema
  };

  const results = await initializeSchema(workflowSchemas, options);
  
  if (results.failed.length > 0) {
    throw new Error(`Failed to initialize ${results.failed.length} workflow schemas: ${results.failed.join(', ')}`);
  }
  
  return results;
}

module.exports = {
  initializeAISchemas,
  initializeApplicationSchemas,
  initializeWorkflowSchemas,
  initializeSchema,
};

// Add a new function to initialize core schemas including custom _User extensions
async function initializeCoreSchemas(options = {}) {
  const allSchemas = {
    // Core Parse Classes that might need extensions or specific CLPs
    _User: UserSchema,
    Organization: OrganizationSchema,
    OrgIntegrationConfig: OrgIntegrationConfigSchema,
    PlatformConfig: PlatformConfigSchema,
    AppFramework: AppFrameworkSchema, // if PlatformConfig is used by AppFrameworkSchemas
    // Workflow System Schemas
    Workflow: WorkflowSchema,
    WorkflowExecution: WorkflowExecutionSchema,
    NodeExecution: NodeExecutionSchema,
    WorkflowTemplate: WorkflowTemplateSchema,
    // Add other core schemas explicitly if they need specific initialization or extensions
  };

  const results = await initializeSchema(allSchemas, options);

  if (results.failed.length > 0) {
    throw new Error(`Failed to initialize ${results.failed.length} core schemas: ${results.failed.join(', ')}`);
  }
  return results;
}

module.exports.initializeCoreSchemas = initializeCoreSchemas;
