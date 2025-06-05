// src/services/objectManagerService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { CustomObject, CustomField, ObjectRecord } from '@/types/object-manager.d'; // Corrected import path

export class ObjectManagerService {
  /**
   * Fetches all custom objects (schemas) with optional filtering and record counts.
   * @param {string} orgId - The ID of the organization.
   * @param {object} [params] - Optional parameters.
   * @param {boolean} [params.includeInactive=false] - Include inactive objects.
   * @param {string} [params.objectType] - Filter by object type (custom, standard).
   * @param {string} [params.searchTerm] - Search term for object names.
   * @param {boolean} [params.includeRecordCount=true] - Include record counts for each object.
   * @returns {Promise<CustomObject[]>} An array of custom objects.
   * @tsdoc
   */
  async fetchObjects(orgId: string, params: {
    includeInactive?: boolean;
    objectType?: string;
    searchTerm?: string;
    includeRecordCount?: boolean;
  } = {}): Promise<CustomObject[]> {
    const { includeInactive = false, objectType, searchTerm, includeRecordCount = true } = params;
    try {
      const schemas = await Parse.Schema.all();
      let objects: CustomObject[] = [];

      for (const schema of schemas) {
        if (schema.className.startsWith('_')) continue; // Skip system classes
        if (objectType === 'custom' && !schema.className.includes('__c')) continue;
        if (objectType === 'standard' && schema.className.includes('__c')) continue;
        if (searchTerm && !schema.className.toLowerCase().includes(searchTerm.toString().toLowerCase())) continue;

        const fields: CustomField[] = Object.entries(schema.fields || {}).map(([fieldName, fieldDef]: [string, any]) => ({
          id: `${schema.className}_${fieldName}`,
          apiName: fieldName,
          label: fieldName.replace(/__c$/, '').replace(/_/g, ' '),
          type: fieldDef.type || 'String',
          required: fieldDef.required || false,
          description: `${fieldDef.type || 'String'} field`,
          // Add targetClass if it exists and fieldDef.type is 'Pointer'
          ...(fieldDef.type === 'Pointer' && fieldDef.targetClass ? { targetClass: fieldDef.targetClass } : {})
        }));

        let recordCount = 0;
        if (includeRecordCount) {
          try {
            const query = new Parse.Query(schema.className);
            if (schema.fields && ('organizationId' in schema.fields || 'organization' in schema.fields)) {
              if ('organizationId' in schema.fields) {
                query.equalTo('organizationId', orgId);
              } else if ('organization' in schema.fields) {
                query.equalTo('organization', Parse.Object.extend('Organization').createWithoutData(orgId)); // Use pointer
              }
            }
            recordCount = await query.count();
          } catch (error) {
            console.warn(`[ObjectManagerService] Failed to get record count for ${schema.className}:`, error);
            recordCount = 0;
          }
        }

        const customObject: CustomObject = {
          id: schema.className,
          apiName: schema.className,
          label: schema.className.replace(/__c$/, '').replace(/_/g, ' '),
          description: `Custom object: ${schema.className}`,
          fields,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          recordCount
        };
        objects.push(customObject);
      }
      return objects;
    } catch (error) {
      console.error('[ObjectManagerService] Error fetching objects:', error);
      throw error;
    }
  }

  /**
   * Creates a new custom object (Parse schema).
   * @param {string} orgId - The ID of the organization creating the object.
   * @param {{ apiName: string; label: string; description?: string; fields?: CustomField[] }} params - Object creation parameters.
   * @returns {Promise<CustomObject>} The newly created custom object.
   * @tsdoc
   */
  async createObject(orgId: string, params: {
    apiName: string;
    label: string;
    description?: string;
    fields?: CustomField[];
  }): Promise<CustomObject> {
    const { apiName, label, description, fields = [] } = params;
    try {
      if (!apiName || typeof apiName !== 'string') {
        throw new Error('API name is required and must be a string');
      }

      const schema = new Parse.Schema(apiName);
      if (Array.isArray(fields)) {
        for (const field of fields) {
          if (field.apiName && field.type) {
            switch (field.type.toLowerCase()) {
              case 'string': schema.addString(field.apiName); break;
              case 'number': schema.addNumber(field.apiName); break;
              case 'boolean': schema.addBoolean(field.apiName); break;
              case 'date': schema.addDate(field.apiName); break;
              case 'array': schema.addArray(field.apiName); break;
              case 'object': schema.addObject(field.apiName); break;
              case 'pointer': schema.addPointer(field.apiName, (field.targetClass as string)); break; // Use targetClass for pointer
              default: schema.addString(field.apiName); // Default to string
            }
          }
        }
      }

      // Add organization pointer if needed for custom objects
      const organizationPointer = Parse.Object.extend('Organization').createWithoutData(orgId);
      schema.addPointer('organization', 'Organization');

      await schema.save();

      const newObject: CustomObject = {
        id: apiName,
        apiName: apiName,
        label: label || apiName,
        description: description || `Custom object: ${apiName}`,
        fields: [], // Fields will be fetched when object is re-read
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        recordCount: 0
      };
      return newObject;
    } catch (error) {
      console.error('[ObjectManagerService] Error creating object:', error);
      throw error;
    }
  }

  /**
   * Fetches records for a specific custom object.
   * @param {string} orgId - The ID of the organization.
   * @param {string} objectApiName - The API name of the object.
   * @param {{ limit?: number; skip?: number; filters?: Record<string, any>; sortBy?: string; sortOrder?: string }} params - Query parameters.
   * @returns {Promise<{ records: ObjectRecord[]; total: number }>} An object containing records and total count.
   * @tsdoc
   */
  async fetchRecords(orgId: string, objectApiName: string, params: {
    limit?: number;
    skip?: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<{ records: ObjectRecord[]; total: number }> {
    const { limit = 100, skip = 0, filters = {}, sortBy, sortOrder = 'asc' } = params;
    try {
      const query = new Parse.Query(objectApiName);
      query.equalTo('organization', Parse.Object.extend('Organization').createWithoutData(orgId)); // Filter by organization
      query.limit(limit);
      query.skip(skip);

      if (sortBy) {
        if (sortOrder === 'desc') query.descending(sortBy);
        else query.ascending(sortBy);
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.equalTo(key, value);
        }
      });

      const records = await query.find();
      const total = await query.count(); // Get total count for pagination
      const recordData: ObjectRecord[] = records.map(record => ({
        id: record.id,
        ...record.toJSON()
      }));

      return { records: recordData, total };
    } catch (error) {
      console.error('[ObjectManagerService] Error fetching records:', error);
      throw error;
    }
  }

  /**
   * Creates a new record in a specific custom object.
   * @param {string} orgId - The ID of the organization.
   * @param {string} objectApiName - The API name of the object.
   * @param {Record<string, any>} recordData - The data for the new record.
   * @returns {Promise<ObjectRecord>} The newly created record.
   * @tsdoc
   */
  async createRecord(orgId: string, objectApiName: string, recordData: Record<string, any>): Promise<ObjectRecord> {
    try {
      const ParseClass = Parse.Object.extend(objectApiName);
      const record = new ParseClass();
      record.set('organization', Parse.Object.extend('Organization').createWithoutData(orgId)); // Add organization pointer
      
      Object.entries(recordData).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'objectId') { // Prevent setting Parse internal IDs
          record.set(key, value);
        }
      });
      const savedRecord = await record.save();
      return { id: savedRecord.id, ...savedRecord.toJSON() };
    } catch (error) {
      console.error('[ObjectManagerService] Error creating record:', error);
      throw error;
    }
  }

  /**
   * Updates an existing record in a specific custom object.
   * @param {string} orgId - The ID of the organization.
   * @param {string} objectApiName - The API name of the object.
   * @param {string} recordId - The ID of the record to update.
   * @param {Record<string, any>} updates - The data to update.
   * @returns {Promise<ObjectRecord>} The updated record.
   * @tsdoc
   */
  async updateRecord(orgId: string, objectApiName: string, recordId: string, updates: Record<string, any>): Promise<ObjectRecord> {
    try {
      const query = new Parse.Query(objectApiName);
      query.equalTo('organization', Parse.Object.extend('Organization').createWithoutData(orgId));
      const record = await query.get(recordId);

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'objectId') {
          record.set(key, value);
        }
      });
      const updatedRecord = await record.save();
      return { id: updatedRecord.id, ...updatedRecord.toJSON() };
    } catch (error) {
      console.error('[ObjectManagerService] Error updating record:', error);
      throw error;
    }
  }

  /**
   * Deletes a specific record from a custom object.
   * @param {string} orgId - The ID of the organization.
   * @param {string} objectApiName - The API name of the object.
   * @param {string} recordId - The ID of the record to delete.
   * @returns {Promise<void>}
   * @tsdoc
   */
  async deleteRecord(orgId: string, objectApiName: string, recordId: string): Promise<void> {
    try {
      const query = new Parse.Query(objectApiName);
      query.equalTo('organization', Parse.Object.extend('Organization').createWithoutData(orgId));
      const record = await query.get(recordId);
      await record.destroy();
    } catch (error) {
      console.error('[ObjectManagerService] Error deleting record:', error);
      throw error;
    }
  }

  /**
   * Deletes a custom object (Parse schema) and all its associated records.
   * NOTE: Direct schema deletion with data purging is best handled by a Parse Cloud Function.
   * This method will call a Cloud Function to ensure data integrity.
   * @param {string} objectApiName - The API name of the object to delete.
   * @param {boolean} confirmDelete - Confirmation flag.
   * @returns {Promise<void>}
   * @tsdoc
   */
  async deleteObject(objectApiName: string, confirmDelete: boolean): Promise<void> {
    try {
      if (!confirmDelete) {
        throw new Error('Confirmation is required to delete an object');
      }
      // Call a Cloud Function for schema deletion and data purging
      await Parse.Cloud.run('deleteObjectSchemaAndData', { objectApiName, confirmDelete });
    } catch (error) {
      console.error('[ObjectManagerService] Error deleting object:', error);
      throw error;
    }
  }

  /**
   * Adds a new field to an existing custom object.
   * NOTE: Schema modifications are best handled by Parse Cloud Functions to avoid client-side SDK limitations.
   * This method will call a Cloud Function.
   * @param {string} objectApiName - The API name of the object.
   * @param {CustomField} field - The field definition.
   * @returns {Promise<CustomObject>} The updated custom object.
   * @tsdoc
   */
  async addFieldToObject(objectApiName: string, field: CustomField): Promise<CustomObject> {
    try {
      // Call a Cloud Function to add the field
      const updatedSchema = await Parse.Cloud.run('addFieldToObjectSchema', { objectApiName, field });
      return this.getObjectByApiName(updatedSchema.className || objectApiName); // Use className from updatedSchema if available
    } catch (error) {
      console.error('[ObjectManagerService] Error adding field to object:', error);
      throw error;
    }
  }

  /**
   * Updates an existing field in a custom object.
   * NOTE: Schema modifications are best handled by Parse Cloud Functions to avoid client-side SDK limitations.
   * This method will call a Cloud Function.
   * @param {string} objectApiName - The API name of the object.
   * @param {string} fieldApiName - The API name of the field to update.
   * @param {Partial<CustomField>} updates - Partial field updates.
   * @returns {Promise<CustomObject>} The updated custom object.
   * @tsdoc
   */
  async updateFieldInObject(objectApiName: string, fieldApiName: string, updates: Partial<CustomField>): Promise<CustomObject> {
    try {
      // Call a Cloud Function to update the field
      const updatedSchema = await Parse.Cloud.run('updateFieldInObjectSchema', { objectApiName, fieldApiName, updates });
      return this.getObjectByApiName(updatedSchema.className || objectApiName); // Use className from updatedSchema if available
    } catch (error) {
      console.error('[ObjectManagerService] Error updating field in object:', error);
      throw error;
    }
  }

  /**
   * Deletes a field from an existing custom object.
   * NOTE: Schema modifications are best handled by Parse Cloud Functions to avoid client-side SDK limitations.
   * This method will call a Cloud Function.
   * @param {string} objectApiName - The API name of the object.
   * @param {string} fieldApiName - The API name of the field to delete.
   * @returns {Promise<CustomObject>} The updated custom object.
   * @tsdoc
   */
  async deleteFieldFromObject(objectApiName: string, fieldApiName: string): Promise<CustomObject> {
    try {
      // Call a Cloud Function to remove the field
      const updatedSchema = await Parse.Cloud.run('removeFieldFromObjectSchema', { objectApiName, fieldApiName });
      return this.getObjectByApiName(updatedSchema.className || objectApiName); // Use className from updatedSchema if available
    } catch (error) {
      console.error('[ObjectManagerService] Error deleting field from object:', error);
      throw error;
    }
  }

  /**
   * Helper to get object data by API name, including fields.
   * @param {string} objectApiName - The API name of the object.
   * @returns {Promise<CustomObject>} The custom object.
   */
  private async getObjectByApiName(objectApiName: string): Promise<CustomObject> {
    const schema = await new Parse.Schema(objectApiName).get();
    const fields: CustomField[] = Object.entries(schema.fields || {}).map(([fieldName, fieldDef]: [string, any]) => ({
      id: `${schema.className}_${fieldName}`,
      apiName: fieldName,
      label: fieldName.replace(/__c$/, '').replace(/_/g, ' '),
      type: fieldDef.type || 'String',
      required: fieldDef.required || false,
      description: `${fieldDef.type || 'String'} field`,
      // Add targetClass if it exists and fieldDef.type is 'Pointer'
      ...(fieldDef.type === 'Pointer' && fieldDef.targetClass ? { targetClass: fieldDef.targetClass } : {})
    }));
    return {
      id: schema.className,
      apiName: schema.className,
      label: schema.className.replace(/__c$/, '').replace(/_/g, ' '),
      description: `Custom object: ${schema.className}`,
      fields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recordCount: 0 // Record count might need to be re-calculated or fetched if needed
    };
  }
}

export const objectManagerService = new ObjectManagerService();