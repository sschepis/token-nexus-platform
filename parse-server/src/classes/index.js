/**
 * CMS Classes Index
 * Exports all CMS classes and provides system initialization
 */

const CMSApplication = require('./CMSApplication');
const CMSAPI = require('./CMSAPI');
const CMSComponent = require('./CMSComponent');
const CMSPage = require('./CMSPage');
const CMSTemplate = require('./CMSTemplate');
const CMSTheme = require('./CMSTheme');
const CMSTrigger = require('./CMSTrigger');
const CMSWorkflow = require('./CMSWorkflow');
const CMSCloudFunction = require('./CMSCloudFunction');

/**
 * Initialize CMS system
 * @param {Parse} Parse - Parse instance
 * @returns {Promise<void>}
 */
async function initializeCMS(Parse) {
  // Register classes with Parse Server
  const classes = [
    CMSApplication,
    CMSAPI,
    CMSComponent,
    CMSPage,
    CMSTemplate,
    CMSTheme,
    CMSTrigger,
    CMSWorkflow,
    CMSCloudFunction,
  ];

  for (const Class of classes) {
    try {
      await Parse.Schema.all()
        .then(schemas => schemas.find(s => s.className === Class.className))
        .then(async existingSchema => {
          if (!existingSchema) {
            const schema = new Parse.Schema(Class.className);
            const fields = Class.getSchema().fields;

            // Add fields to schema
            Object.entries(fields).forEach(([fieldName, fieldConfig]) => {
              switch (fieldConfig.type) {
                case 'String':
                  schema.addString(fieldName, fieldConfig);
                  break;
                case 'Number':
                  schema.addNumber(fieldName, fieldConfig);
                  break;
                case 'Boolean':
                  schema.addBoolean(fieldName, fieldConfig);
                  break;
                case 'Date':
                  schema.addDate(fieldName, fieldConfig);
                  break;
                case 'Object':
                  schema.addObject(fieldName, fieldConfig);
                  break;
                case 'Array':
                  schema.addArray(fieldName, fieldConfig);
                  break;
                case 'Pointer':
                  schema.addPointer(fieldName, fieldConfig.targetClass, fieldConfig);
                  break;
                case 'Relation':
                  schema.addRelation(fieldName, fieldConfig.targetClass, fieldConfig);
                  break;
                case 'File':
                  schema.addFile(fieldName, fieldConfig);
                  break;
                case 'GeoPoint':
                  schema.addGeoPoint(fieldName, fieldConfig);
                  break;
                case 'Polygon':
                  schema.addPolygon(fieldName, fieldConfig);
                  break;
                case 'ACL':
                  // ACL is added automatically
                  break;
                default:
                  console.warn(`Unknown field type: ${fieldConfig.type} for ${fieldName}`);
              }
            });

            // Add indexes
            const indexes = Class.getSchema().indexes;
            if (indexes) {
              Object.entries(indexes).forEach(([name, index]) => {
                schema.addIndex(name, index);
              });
            }

            // Set permissions
            const permissions = Class.getSchema().classLevelPermissions;
            if (permissions) {
              schema.setCLP(permissions);
            }

            await schema.save();
            console.log(`Created schema for ${Class.className}`);
          }
        });

      // Register class with Parse
      Parse.Object.registerSubclass(Class.className, Class);
      console.log(`Registered ${Class.className} with Parse`);
    } catch (error) {
      console.error(`Error initializing ${Class.className}:`, error);
      throw error;
    }
  }
}

/**
 * Get CMS class by name
 * @param {string} className - Name of the CMS class
 * @returns {Class} CMS class
 */
function getCMSClass(className) {
  switch (className) {
    case 'CMSApplication':
      return CMSApplication;
    case 'CMSAPI':
      return CMSAPI;
    case 'CMSComponent':
      return CMSComponent;
    case 'CMSPage':
      return CMSPage;
    case 'CMSTemplate':
      return CMSTemplate;
    case 'CMSTheme':
      return CMSTheme;
    case 'CMSTrigger':
      return CMSTrigger;
    case 'CMSWorkflow':
      return CMSWorkflow;
    case 'CMSCloudFunction':
      return CMSCloudFunction;
    default:
      throw new Error(`Unknown CMS class: ${className}`);
  }
}

module.exports = {
  // Classes
  CMSApplication,
  CMSAPI,
  CMSComponent,
  CMSPage,
  CMSTemplate,
  CMSTheme,
  CMSTrigger,
  CMSWorkflow,
  CMSCloudFunction,

  // Initialization
  initializeCMS,
  getCMSClass,

  // Constants
  CMS_CLASSES: {
    APPLICATION: 'CMSApplication',
    API: 'CMSAPI',
    COMPONENT: 'CMSComponent',
    PAGE: 'CMSPage',
    TEMPLATE: 'CMSTemplate',
    THEME: 'CMSTheme',
    TRIGGER: 'CMSTrigger',
    WORKFLOW: 'CMSWorkflow',
    CLOUD_FUNCTION: 'CMSCloudFunction',
  },
};
