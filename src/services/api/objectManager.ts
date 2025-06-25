import { callCloudFunction, callCloudFunctionForArray } from '@/utils/apiUtils';
import { CustomObject, CustomField, ObjectRecord } from '@/types/object-manager';
import { 
  FetchObjectsParams, 
  CreateObjectParams, 
  FetchRecordsParams, 
  CreateRecordParams, 
  UpdateRecordParams, 
  DeleteRecordParams, 
  AddFieldParams, 
  UpdateFieldParams, 
  DeleteFieldParams, 
  DeleteObjectParams 
} from './objectManager/types/ObjectManagerTypes';

/**
 * Object Manager API using the proper cloud function pattern
 * This eliminates direct Parse SDK calls that require master key on client
 */
export const objectManagerApi = {
  /**
   * Fetches all custom objects (schemas) with optional filtering and record counts.
   */
  async fetchObjects(params: FetchObjectsParams) {
    return await callCloudFunctionForArray<CustomObject>(
      'getCustomObjects',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to fetch custom objects',
        defaultValue: []
      }
    );
  },

  /**
   * Creates a new custom object (Parse schema).
   */
  async createObject(params: CreateObjectParams) {
    return await callCloudFunction<CustomObject>(
      'createCustomObject',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to create custom object'
      }
    );
  },

  /**
   * Fetches records for a specific custom object.
   */
  async fetchRecords(params: FetchRecordsParams) {
    return await callCloudFunction<{ records: ObjectRecord[]; total: number }>(
      'getObjectRecords',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to fetch object records'
      }
    );
  },

  /**
   * Creates a new record in a specific custom object.
   */
  async createRecord(params: CreateRecordParams) {
    return await callCloudFunction<ObjectRecord>(
      'createObjectRecord',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to create object record'
      }
    );
  },

  /**
   * Updates an existing record in a specific custom object.
   */
  async updateRecord(params: UpdateRecordParams) {
    return await callCloudFunction<ObjectRecord>(
      'updateObjectRecord',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to update object record'
      }
    );
  },

  /**
   * Deletes a specific record from a custom object.
   */
  async deleteRecord(params: DeleteRecordParams) {
    return await callCloudFunction<{ success: boolean }>(
      'deleteObjectRecord',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to delete object record'
      }
    );
  },

  /**
   * Deletes a custom object (Parse schema) and all its associated records.
   */
  async deleteObject(params: DeleteObjectParams) {
    return await callCloudFunction<{ success: boolean }>(
      'deleteCustomObject',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to delete custom object'
      }
    );
  },

  /**
   * Adds a new field to an existing custom object.
   */
  async addFieldToObject(params: AddFieldParams) {
    return await callCloudFunction<CustomObject>(
      'addFieldToObject',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to add field to object'
      }
    );
  },

  /**
   * Updates an existing field in a custom object.
   */
  async updateFieldInObject(params: UpdateFieldParams) {
    return await callCloudFunction<CustomObject>(
      'updateFieldInObject',
      params as unknown as Record<string, unknown>,
      {
        errorMessage: 'Failed to update field in object'
      }
    );
  },

  /**
   * Deletes a field from an existing custom object.
   */
  async deleteFieldFromObject(params: DeleteFieldParams) {
    return await callCloudFunction<CustomObject>(
      'deleteFieldFromObject',
      params as unknown as Partial<CustomField>,
      {
        errorMessage: 'Failed to delete field from object'
      }
    );
  },

  /**
   * Gets a specific custom object by API name.
   */
  async getObjectByApiName(objectApiName: string, orgId: string) {
    return await callCloudFunction<CustomObject>(
      'getCustomObjectByName',
      { objectApiName, orgId },
      {
        errorMessage: 'Failed to get custom object'
      }
    );
  }
};

export default objectManagerApi;