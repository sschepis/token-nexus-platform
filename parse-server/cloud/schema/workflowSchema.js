const Parse = require('parse/node');

/**
 * Workflow System Database Schema
 * Defines Parse classes for the workflow automation system
 */

// Workflow Class Schema
const WorkflowSchema = {
  className: 'Workflow',
  fields: {
    // Basic Information
    name: { type: 'String', required: true },
    description: { type: 'String' },
    status: { 
      type: 'String', 
      required: true,
      // Values: 'draft', 'active', 'paused', 'error', 'archived'
    },
    
    // Workflow Definition
    nodes: { type: 'Array' }, // Array of WorkflowNode objects
    edges: { type: 'Array' }, // Array of WorkflowEdge objects
    
    // Organization & User Management
    organizationId: { type: 'String', required: true },
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    updatedBy: { type: 'Pointer', targetClass: '_User' },
    
    // Versioning & Metadata
    version: { type: 'Number', required: true },
    tags: { type: 'Array' }, // Array of strings
    metadata: { type: 'Object' }, // Additional metadata including template info, execution stats
    
    // Timestamps (automatically managed by Parse)
    createdAt: { type: 'Date' },
    updatedAt: { type: 'Date' }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    update: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  },
  indexes: {
    organizationId: { organizationId: 1 },
    status: { status: 1 },
    createdBy: { createdBy: 1 },
    tags: { tags: 1 },
    compound_org_status: { organizationId: 1, status: 1 },
    compound_org_updated: { organizationId: 1, updatedAt: -1 }
  }
};

// WorkflowExecution Class Schema
const WorkflowExecutionSchema = {
  className: 'WorkflowExecution',
  fields: {
    // Execution Information
    workflowId: { type: 'String', required: true },
    status: { 
      type: 'String', 
      required: true
      // Values: 'pending', 'running', 'completed', 'failed', 'cancelled'
    },
    
    // Timing
    startTime: { type: 'Date', required: true },
    endTime: { type: 'Date' },
    duration: { type: 'Number' }, // Duration in milliseconds
    
    // Trigger Information
    triggeredBy: { 
      type: 'String', 
      required: true
      // Values: 'manual', 'schedule', 'webhook', 'trigger'
    },
    triggerData: { type: 'Object' }, // Data that triggered the execution
    
    // Execution Results
    nodeExecutions: { type: 'Array' }, // Array of NodeExecution objects
    error: { type: 'String' }, // Error message if execution failed
    result: { type: 'Object' }, // Final execution result
    
    // Organization & User Management
    organizationId: { type: 'String', required: true },
    userId: { type: 'String' }, // User who triggered the execution
    
    // Timestamps
    createdAt: { type: 'Date' },
    updatedAt: { type: 'Date' }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    update: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  },
  indexes: {
    workflowId: { workflowId: 1 },
    organizationId: { organizationId: 1 },
    status: { status: 1 },
    startTime: { startTime: -1 },
    compound_workflow_status: { workflowId: 1, status: 1 },
    compound_org_start: { organizationId: 1, startTime: -1 }
  }
};

// NodeExecution Class Schema (for detailed node execution tracking)
const NodeExecutionSchema = {
  className: 'NodeExecution',
  fields: {
    // Node Information
    nodeId: { type: 'String', required: true },
    nodeName: { type: 'String', required: true },
    nodeType: { type: 'String', required: true },
    
    // Execution Information
    executionId: { type: 'String', required: true }, // Reference to WorkflowExecution
    status: { 
      type: 'String', 
      required: true
      // Values: 'pending', 'running', 'completed', 'failed', 'cancelled'
    },
    
    // Timing
    startTime: { type: 'Date', required: true },
    endTime: { type: 'Date' },
    duration: { type: 'Number' }, // Duration in milliseconds
    
    // Input/Output
    input: { type: 'Object' }, // Input data for the node
    output: { type: 'Object' }, // Output data from the node
    error: { type: 'String' }, // Error message if node execution failed
    
    // Retry Information
    retryCount: { type: 'Number', default: 0 },
    maxRetries: { type: 'Number', default: 3 },
    
    // Organization Management
    organizationId: { type: 'String', required: true },
    
    // Timestamps
    createdAt: { type: 'Date' },
    updatedAt: { type: 'Date' }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    update: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  },
  indexes: {
    executionId: { executionId: 1 },
    nodeId: { nodeId: 1 },
    organizationId: { organizationId: 1 },
    status: { status: 1 },
    startTime: { startTime: -1 },
    compound_execution_node: { executionId: 1, nodeId: 1 }
  }
};

// WorkflowTemplate Class Schema (for reusable workflow templates)
const WorkflowTemplateSchema = {
  className: 'WorkflowTemplate',
  fields: {
    // Template Information
    name: { type: 'String', required: true },
    description: { type: 'String', required: true },
    category: { type: 'String', required: true },
    icon: { type: 'String' },
    
    // Template Definition
    nodes: { type: 'Array', required: true }, // Array of WorkflowNode objects
    edges: { type: 'Array', required: true }, // Array of WorkflowEdge objects
    
    // Classification
    tags: { type: 'Array' }, // Array of strings
    difficulty: { 
      type: 'String'
      // Values: 'beginner', 'intermediate', 'advanced'
    },
    
    // Metadata
    author: { type: 'String' },
    version: { type: 'String' },
    estimatedSetupTime: { type: 'Number' }, // Minutes
    requiredServices: { type: 'Array' }, // Array of required service IDs
    useCases: { type: 'Array' }, // Array of use case descriptions
    
    // Visibility
    isPublic: { type: 'Boolean', default: false },
    organizationId: { type: 'String' }, // null for global templates
    createdBy: { type: 'Pointer', targetClass: '_User', required: true },
    
    // Usage Statistics
    usageCount: { type: 'Number', default: 0 },
    rating: { type: 'Number' }, // Average rating
    
    // Timestamps
    createdAt: { type: 'Date' },
    updatedAt: { type: 'Date' }
  },
  classLevelPermissions: {
    find: { '*': true },
    count: { '*': true },
    get: { '*': true },
    update: { requiresAuthentication: true },
    create: { requiresAuthentication: true },
    delete: { requiresAuthentication: true }
  },
  indexes: {
    category: { category: 1 },
    tags: { tags: 1 },
    isPublic: { isPublic: 1 },
    organizationId: { organizationId: 1 },
    difficulty: { difficulty: 1 },
    usageCount: { usageCount: -1 },
    rating: { rating: -1 }
  }
};

/**
 * Initialize workflow schemas
 */
async function initializeWorkflowSchemas() {
  try {
    console.log('Initializing workflow schemas...');
    
    // Create schemas
    await createSchemaIfNotExists(WorkflowSchema);
    await createSchemaIfNotExists(WorkflowExecutionSchema);
    await createSchemaIfNotExists(NodeExecutionSchema);
    await createSchemaIfNotExists(WorkflowTemplateSchema);
    
    console.log('Workflow schemas initialized successfully');
  } catch (error) {
    console.error('Error initializing workflow schemas:', error);
    throw error;
  }
}

/**
 * Helper function to create schema if it doesn't exist
 */
async function createSchemaIfNotExists(schemaConfig) {
  try {
    const schema = new Parse.Schema(schemaConfig.className);
    
    // Check if class already exists
    const existingSchema = await schema.get().catch(() => null);
    
    if (!existingSchema) {
      console.log(`Creating schema for ${schemaConfig.className}...`);
      
      // Add fields
      Object.entries(schemaConfig.fields).forEach(([fieldName, fieldConfig]) => {
        if (fieldName === 'createdAt' || fieldName === 'updatedAt') {
          return; // Skip built-in fields
        }
        
        switch (fieldConfig.type) {
          case 'String':
            schema.addString(fieldName, fieldConfig.required);
            break;
          case 'Number':
            schema.addNumber(fieldName, fieldConfig.required);
            break;
          case 'Boolean':
            schema.addBoolean(fieldName, fieldConfig.required);
            break;
          case 'Date':
            schema.addDate(fieldName, fieldConfig.required);
            break;
          case 'Array':
            schema.addArray(fieldName, fieldConfig.required);
            break;
          case 'Object':
            schema.addObject(fieldName, fieldConfig.required);
            break;
          case 'Pointer':
            schema.addPointer(fieldName, fieldConfig.targetClass, fieldConfig.required);
            break;
          default:
            console.warn(`Unknown field type: ${fieldConfig.type} for field: ${fieldName}`);
        }
        
        // Set default value if specified
        if (fieldConfig.default !== undefined) {
          schema.addField(fieldName, fieldConfig.type, { defaultValue: fieldConfig.default });
        }
      });
      
      // Set class level permissions
      if (schemaConfig.classLevelPermissions) {
        Object.entries(schemaConfig.classLevelPermissions).forEach(([operation, permissions]) => {
          schema.setCLP(operation, permissions);
        });
      }
      
      // Save schema
      await schema.save();
      console.log(`Schema ${schemaConfig.className} created successfully`);
      
      // Add indexes
      if (schemaConfig.indexes) {
        console.log(`Adding indexes for ${schemaConfig.className}...`);
        Object.entries(schemaConfig.indexes).forEach(([indexName, indexSpec]) => {
          schema.addIndex(indexName, indexSpec).catch(error => {
            console.warn(`Failed to add index ${indexName} to ${schemaConfig.className}:`, error.message);
          });
        });
      }
    } else {
      console.log(`Schema ${schemaConfig.className} already exists`);
    }
  } catch (error) {
    console.error(`Error creating schema ${schemaConfig.className}:`, error);
    throw error;
  }
}

/**
 * Setup default workflow templates
 */
async function setupDefaultWorkflowTemplates() {
  try {
    console.log('Setting up default workflow templates...');
    
    const templates = [
      {
        name: 'User Onboarding',
        description: 'Automated user onboarding workflow with welcome email and account setup',
        category: 'user-management',
        icon: 'user-plus',
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        tags: ['onboarding', 'email', 'user'],
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger-manual',
            category: 'trigger',
            name: 'New User Signup',
            position: { x: 100, y: 100 },
            data: {
              label: 'New User Signup',
              config: {}
            }
          },
          {
            id: 'action-1',
            type: 'action-notification',
            category: 'action',
            name: 'Send Welcome Email',
            position: { x: 300, y: 100 },
            data: {
              label: 'Send Welcome Email',
              config: {
                type: 'email',
                message: 'Welcome to our platform!',
                template: 'welcome-email'
              }
            }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'action-1'
          }
        ],
        isPublic: true,
        useCases: ['User registration', 'Welcome automation', 'Account setup']
      },
      {
        name: 'Data Processing Pipeline',
        description: 'Process incoming data with validation, transformation, and storage',
        category: 'data-processing',
        icon: 'database',
        difficulty: 'intermediate',
        estimatedSetupTime: 30,
        tags: ['data', 'processing', 'validation'],
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger-webhook',
            category: 'trigger',
            name: 'Data Webhook',
            position: { x: 100, y: 100 },
            data: {
              label: 'Data Webhook',
              config: {
                url: '/webhook/data'
              }
            }
          },
          {
            id: 'logic-1',
            type: 'logic-condition',
            category: 'logic',
            name: 'Validate Data',
            position: { x: 300, y: 100 },
            data: {
              label: 'Validate Data',
              config: {
                condition: 'data.isValid === true'
              }
            }
          },
          {
            id: 'logic-2',
            type: 'logic-transform',
            category: 'logic',
            name: 'Transform Data',
            position: { x: 500, y: 50 },
            data: {
              label: 'Transform Data',
              config: {
                script: 'return { ...data, processed: true, timestamp: new Date() }'
              }
            }
          },
          {
            id: 'action-1',
            type: 'action-cloud-function',
            category: 'action',
            name: 'Store Data',
            position: { x: 700, y: 50 },
            data: {
              label: 'Store Data',
              config: {
                functionName: 'storeProcessedData'
              }
            }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'logic-1'
          },
          {
            id: 'edge-2',
            source: 'logic-1',
            target: 'logic-2',
            sourceHandle: 'true'
          },
          {
            id: 'edge-3',
            source: 'logic-2',
            target: 'action-1'
          }
        ],
        isPublic: true,
        useCases: ['Data ingestion', 'ETL processes', 'API data processing']
      }
    ];
    
    for (const templateData of templates) {
      const existingTemplate = await new Parse.Query('WorkflowTemplate')
        .equalTo('name', templateData.name)
        .equalTo('isPublic', true)
        .first({ useMasterKey: true });
      
      if (!existingTemplate) {
        const template = new Parse.Object('WorkflowTemplate');
        template.set(templateData);
        
        // Set ACL for public access
        const acl = new Parse.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(false);
        template.setACL(acl);
        
        await template.save(null, { useMasterKey: true });
        console.log(`Created template: ${templateData.name}`);
      }
    }
    
    console.log('Default workflow templates setup complete');
  } catch (error) {
    console.error('Error setting up default workflow templates:', error);
  }
}

module.exports = {
  initializeWorkflowSchemas,
  setupDefaultWorkflowTemplates,
  WorkflowSchema,
  WorkflowExecutionSchema,
  NodeExecutionSchema,
  WorkflowTemplateSchema
};