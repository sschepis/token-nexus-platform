/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { getCurrentOrganizationId as getOrgId, setGlobalOrganizationContext } from '@/utils/organizationUtils';

// Define basic interfaces for Parse Objects (assuming common methods)
export interface ParseObject {
  id: string;
  get(key: string): any;
  set(key: string, value: any): void;
  save(): Promise<this>;
  destroy(): Promise<this>;
  relation(key: string): { add(objects: ParseObject[]): void; remove(objects: ParseObject[]): void };
}

export interface ParseQuery<T extends ParseObject> {
  equalTo(key: string, value: any): ParseQuery<T>;
  first(): Promise<T | undefined>;
  find(): Promise<T[]>;
  get(objectId: string): Promise<T>; // Added get method for fetching by ID
}

// Define interfaces for specific Parse classes used
export interface OrganizationParseObject extends ParseObject {
  get(key: 'name'): string;
}

export interface ProjectParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'description'): string;
  get(key: 'organization'): OrganizationParseObject;
}

export interface DeploymentParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'description'): string;
  get(key: 'project'): ProjectParseObject;
}

export interface BlockchainParseObject extends ParseObject {
  get(key: 'networkId'): number;
  get(key: 'rpcEndpoint'): string;
  get(key: 'blockExplorerUrl'): string; // Added blockExplorerUrl based on UI needs
}

export interface AbiParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'data'): any; // ABI structure can be complex, using any for simplicity here
}

export interface SmartContractParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'abi'): AbiParseObject;
  get(key: 'name'): string;
  get(key: 'code'): string;
}

export interface DiamondParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'symbol'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'diamondFactory'): DiamondFactoryParseObject;
  get(key: 'organization'): OrganizationParseObject; // Link Diamond instance to Organization
}

export interface DiamondFacetParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'abi'): AbiParseObject;
  get(key: 'smartContract'): SmartContractParseObject;
  get(key: 'name'): string;
  get(key: 'code'): string;
}

export interface DiamondFactoryParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'networkId'): number;
  get(key: 'abi'): AbiParseObject;
  get(key: 'smartContract'): SmartContractParseObject;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'deployment'): DeploymentParseObject;
}

export interface EventDefinitionParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'contractName'): string;
  get(key: 'abi'): AbiParseObject;
  get(key: 'data'): any; // Event data structure can be complex
  get(key: 'inputs'): any[]; // Event inputs structure can be complex
  get(key: 'type'): string;
  get(key: 'diamond'): DiamondParseObject;
  get(key: 'network'): BlockchainParseObject;
}

export interface EventListenerParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'networkId'): number;
  get(key: 'definition'): EventDefinitionParseObject;
  get(key: 'address'): string;
  get(key: 'enabled'): boolean;
  get(key: 'project'): ProjectParseObject;
  get(key: 'diamond'): DiamondParseObject;
  set(key: 'enabled', value: boolean): void;
}

export interface DeploymentArtifactParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'abi'): any; // ABI data within artifact
  get(key: 'args'): any;
  get(key: 'receipt'): any;
  get(key: 'address'): string;
  get(key: 'transactionHash'): string;
  get(key: 'solcInputHash'): string;
  get(key: 'deployedBytecode'): string;
  get(key: 'libraries'): any;
  get(key: 'storageLayout'): any;
  get(key: 'metadata'): string;
  get(key: 'name'): string;
  get(key: 'devdoc'): any;
  get(key: 'userdoc'): any;
}

export interface SourceCodeParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'name'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'file'): string;
  get(key: 'content'): string;
  get(key: 'keccak256'): string;
  get(key: 'license'): string;
}

export interface BytecodeParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'abi'): AbiParseObject;
  get(key: 'bytecode'): string;
  get(key: 'contractName'): string;
  get(key: 'name'): string;
  get(key: 'address'): string;
}

export interface DevdocParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'artifact'): DeploymentArtifactParseObject;
  get(key: 'data'): any;
}

export interface UserdocParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'artifact'): DeploymentArtifactParseObject;
  get(key: 'data'): any;
}


// Define interface for the structure of Hardhat deployment JSON artifacts
export interface DeploymentArtifactJson {
  contractName: string;
  address: string;
  abi: any; // ABI structure can be complex
  args?: any[];
  receipt?: any;
  transactionHash?: string;
  solcInputHash?: string;
  deployedBytecode?: string;
  libraries?: any;
  storageLayout?: any;
  metadata?: string;
  devdoc?: any;
  userdoc?: any;
}

// Define interface for the structure returned by readAbisFromDeploymentsFolder
export interface NetworkDeploymentData {
  name: string;
  abi: any; // ABI structure can be complex
  address: string;
  networkName: string;
  networkId: number;
  artifact: DeploymentArtifactJson;
}


/**
 * Generic function to get or create a Parse record.
 * @param className The Parse class name.
 * @param queryKeys Keys for querying existing records.
 * @param queryValues Values for querying existing records.
 * @param data Data for creating or updating the record.
 * @returns The Parse object or undefined on error.
 */
export async function getOrCreateRecord<T extends ParseObject>(
  className: string,
  queryKeys: string[],
  queryValues: any[],
  data: any
): Promise<T | undefined> {
  try {
    const query = new Parse.Query(className); // Use Parse's actual query type
    for (let i = 0; i < queryKeys.length; i++) {
      query.equalTo(queryKeys[i], queryValues[i]);
    }
    let record = await query.first() as unknown as T | undefined; // Convert to unknown before asserting

    if (record) {
      // Update existing record
      for (const key in data) {
        record.set(key, data[key]);
      }
      await record.save();
      console.log(`Updated existing ${className} record with ID: ${record.id}`);
    } else {
      // Create new record
      const ParseClass = Parse.Object.extend(className);
      record = new ParseClass() as T;
      for (const key in data) {
        record.set(key, data[key]);
      }
      await record.save();
      console.log(`Created new ${className} record with ID: ${record.id}`);
    }
    return record;
  } catch (error) {
    console.error(`Error getting or creating ${className} record:`, error);
    return undefined;
  }
}

/**
 * Get a Parse record by its ID.
 * @param className The Parse class name.
 * @param objectId The ID of the object.
 * @returns The Parse object or undefined if not found or on error.
 */
export async function getRecordById<T extends ParseObject>(
  className: string,
  objectId: string
): Promise<any> {
  try {
    const query = new Parse.Query(className); // Use Parse's actual query type
    const record = await query.get(objectId) as unknown as T; // Convert to unknown before asserting
    return record;
  } catch (error) {
    console.error(`Error getting ${className} record with ID ${objectId}:`, error);
    return undefined;
  }
}

/**
 * Get Parse records based on query criteria.
 * @param className The Parse class name.
 * @param queryKeys Keys for querying records.
 * @param queryValues Values for querying records.
 * @returns An array of Parse objects or an empty array on error.
 */
export async function getRecords<T extends ParseObject>(
  className: string,
  queryKeys?: string[],
  queryValues?: any[]
): Promise<T[]> {
  try {
    const query = new Parse.Query(className); // Use Parse's actual query type
    if (queryKeys && queryValues) {
      for (let i = 0; i < queryKeys.length; i++) {
        query.equalTo(queryKeys[i], queryValues[i]);
      }
    }
    const records = await query.find() as unknown as T[]; // Convert to unknown before asserting
    return records;
  } catch (error) {
    console.error(`Error getting ${className} records:`, error);
    return [];
  }
}

export async function createSchemas(
  schemaNames: string[]
): Promise<void> {
  try {
    for (const schemaName of schemaNames) {
      const schema = new Parse.Schema(schemaName);
      console.log(`Created schema: ${schemaName}`);
      //await schema.create();
    }
  } catch (error) {
    console.error(`Error creating schemas:`, error);
  }
}

export async function getAllSchemas(): Promise<string[]> {
  try {
    const schemas = await Parse.Schema.all();
    return schemas.map((schema) => schema.className);
  } catch (error) {
    console.error(`Error getting all schemas:`, error);
    return [];
  }
}
export async function deleteSchema(schemaName: string): Promise<void> {
  try {
    const schema = new Parse.Schema(schemaName);
    await schema.delete();
    console.log(`Deleted schema: ${schemaName}`);
  } catch (error) {
    console.error(`Error deleting schema ${schemaName}:`, error);
  }
}
export async function deleteSchemas(schemaNames: string[]): Promise<void> {
  try {
    for (const schemaName of schemaNames) {
      await deleteSchema(schemaName);
    }
  } catch (error) {
    console.error(`Error deleting schemas:`, error);
  }
}
export async function getAllRecords<T extends ParseObject>(
  className: string
): Promise<T[]> {
  try {
    const query = new Parse.Query(className);
    const records = await query.find() as unknown as T[]; // Convert to unknown before asserting
    return records;
  } catch (error) {
    console.error(`Error getting all ${className} records:`, error);
    return [];
  }
}
export async function deleteAllRecords<T extends ParseObject>(
  className: string
): Promise<void> {
  try {
    const records = await getAllRecords<T>(className);
    for (const record of records) {
      await record.destroy();
    }
    console.log(`Deleted all ${className} records.`);
  } catch (error) {
    console.error(`Error deleting all ${className} records:`, error);
  }
}
export async function deleteRecordById<T extends ParseObject>(
  className: string,
  objectId: string
): Promise<void> {
  try {
    const record = await getRecordById<T>(className, objectId);
    if (record) {
      await record.destroy();
      console.log(`Deleted ${className} record with ID: ${objectId}`);
    } else {
      console.log(`No ${className} record found with ID: ${objectId}`);
    }
  } catch (error) {
    console.error(`Error deleting ${className} record with ID ${objectId}:`, error);
  }
}
export async function deleteRecordsByIds<T extends ParseObject>(
  className: string,
  objectIds: string[]
): Promise<void> {
  try {
    for (const objectId of objectIds) {
      await deleteRecordById<T>(className, objectId);
    }
  } catch (error) {
    console.error(`Error deleting ${className} records with IDs ${objectIds}:`, error);
  }
}
export async function deleteAllSchemas(): Promise<void> {
  try {
    const schemaNames = await getAllSchemas();
    await deleteSchemas(schemaNames);
  } catch (error) {
    console.error(`Error deleting all schemas:`, error);
  }
}

/**
 * Checks if a SmartContract with the given name exists using tenant-aware cloud function.
 * @param contractName The name of the smart contract to check for.
 *
 * @returns True if the smart contract exists, false otherwise.
 */
export async function hasSmartContract(contractName: string): Promise<boolean> {
  // Smart contracts are optional and may not be available yet
  // This should not block basic platform functionality

  // Check if Parse is initialized
  if (!Parse.applicationId) {
    console.warn('Parse not initialized, cannot check for smart contracts');
    return false;
  }

  try {
    // Organization context is now automatically injected by middleware
    const result = await Parse.Cloud.run('hasSmartContract', {
      contractName
      // organizationId removed - now handled by middleware
    }, {
      sessionToken: Parse.User.current()?.getSessionToken()
    });
    
    return result.exists || false;
  } catch (error) {
    console.error(`Error checking for SmartContract ${contractName}:`, error);
    
    // Fallback to direct query if cloud function fails
    try {
      const query = new Parse.Query('SmartContract');
      query.equalTo('name', contractName);
      
      const organizationId = getCurrentOrganizationId();
      if (organizationId && organizationId !== 'default') {
        query.equalTo('organization', organizationId);
      }
      
      const count = await query.count();
      return count > 0;
    } catch (fallbackError) {
      console.error(`Fallback query also failed for SmartContract ${contractName}:`, fallbackError);
      return false;
    }
  }
}

/**
 * Get current organization ID using the centralized utility
 * This ensures consistency across the entire application
 */
function getCurrentOrganizationId(): string {
  const orgId = getOrgId();
  
  // Set global context for cloud functions
  setGlobalOrganizationContext(orgId);
  
  return orgId;
}

/**
 * Get smart contracts for current tenant
 */
export async function getSmartContracts(): Promise<any[]> {
  try {
    const organizationId = getCurrentOrganizationId();
    
    // Set organization context globally before making the call
    if (typeof window !== 'undefined') {
      (window as any).currentOrganizationId = organizationId;
    }
    
    const result = await Parse.Cloud.run('getSmartContracts', {
      // organizationId removed - now handled by middleware
    }, {
      sessionToken: Parse.User.current()?.getSessionToken()
    });
    
    return result.contracts || [];
  } catch (error) {
    console.error('Error getting smart contracts:', error);
    
    // Fallback to direct query
    try {
      const query = new Parse.Query('SmartContract');
      const organizationId = getCurrentOrganizationId();
      
      if (organizationId && organizationId !== 'default') {
        query.equalTo('organization', organizationId);
      }
      
      query.equalTo('isActive', true);
      const results = await query.find();
      
      return results.map(contract => ({
        id: contract.id,
        name: contract.get('name'),
        address: contract.get('address'),
        network: contract.get('network'),
        abi: contract.get('abi'),
        deployedAt: contract.get('deployedAt'),
        organizationId: contract.get('organization')?.id
      }));
    } catch (fallbackError) {
      console.error('Fallback query also failed for smart contracts:', fallbackError);
      return [];
    }
  }
}

/**
 * Import smart contract for current tenant
 */
export async function importSmartContract(contractData: {
  name: string;
  address: string;
  network: string;
  abi: any;
  deployedAt?: Date;
}): Promise<boolean> {
  try {
    // Organization context is now automatically injected by middleware
    const result = await Parse.Cloud.run('importSmartContract', {
      contractData
      // organizationId removed - now handled by middleware
    }, {
      sessionToken: Parse.User.current()?.getSessionToken()
    });
    
    return result.success || false;
  } catch (error) {
    console.error('Error importing smart contract:', error);
    return false;
  }
}


/**
 * create a record in the parse database. Throws an error if the record already exists
 * @param collectionName
 * @param collectionIdFields
 * @param collectionIdsValues
 * @returns {Promise<Parse.Object>}
 */
export async function createRecord(
  collectionName: any,
  collectionIdFields: any = [],
  collectionIdsValues: any = [],
  data: any = {}
): Promise<Parse.Object | undefined> {
  try {
    const Collection = Parse.Object.extend(collectionName);
    const query = new Parse.Query(Collection);

    if (collectionIdFields && collectionIdFields.length > 0) {
      collectionIdFields.forEach((cif: any, i: number) =>
        query.equalTo(cif, collectionIdsValues[i])
      );
      const record = await query.first();
      if (record) {
        throw new Error('Record already exists');
      } else {
        const newRecord = new Collection();
        return newRecord.save(data);
      }
    } else {
      const newRecord = new Collection();
      return newRecord.save(data);
    }

  } catch (e: any) {
    console.log(
      `createRecord: Error creating record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIdsValues ${collectionIdsValues}  ${e.message}`
    );
  }
}

export async function createRecords(
  collectionName: any,
  collectionIdFields: any = [],
  collectionIdsValues: any = [],
  data: any = {}
): Promise<Parse.Object | undefined> {

  try {

    const Collection = Parse.Object.extend(collectionName);
    const query = new Parse.Query(Collection);

    if (collectionIdFields.length > 0) {

      for (let i = 0; i < collectionIdFields.length; i++) {
  
          if(typeof collectionIdsValues[i] == "object" && collectionIdsValues[i].length > 0){
              query.containedIn(collectionIdFields[i], collectionIdsValues[i]);
          }else{
            // filter out any undefined values
            query.equalTo(collectionIdFields[i], collectionIdsValues[i]);
          }
      }

      const record = await query.first();

      if (record) {

        throw new Error('Collection contains existing records!');

      } else {

        return Parse.Object.saveAll(data);;

      }

    } else {

      return Parse.Object.saveAll(data);;

    }

  } catch (e: any) {
    console.log(
      `createRecords: Error creating record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIdsValues ${collectionIdsValues}  ${e.message}\n`, e
    );
  }
}
