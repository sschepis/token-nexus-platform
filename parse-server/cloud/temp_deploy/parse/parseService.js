"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateRecord = getOrCreateRecord;
exports.getRecordById = getRecordById;
exports.getRecords = getRecords;
exports.createSchemas = createSchemas;
exports.getAllSchemas = getAllSchemas;
exports.deleteSchema = deleteSchema;
exports.deleteSchemas = deleteSchemas;
exports.getAllRecords = getAllRecords;
exports.deleteAllRecords = deleteAllRecords;
exports.deleteRecordById = deleteRecordById;
exports.deleteRecordsByIds = deleteRecordsByIds;
exports.deleteAllSchemas = deleteAllSchemas;
exports.createRecord = createRecord;
exports.createRecords = createRecords;
/* eslint-disable @typescript-eslint/no-explicit-any */
const parse_1 = __importDefault(require("parse"));
/**
 * Generic function to get or create a Parse record.
 * @param className The Parse class name.
 * @param queryKeys Keys for querying existing records.
 * @param queryValues Values for querying existing records.
 * @param data Data for creating or updating the record.
 * @returns The Parse object or undefined on error.
 */
async function getOrCreateRecord(className, queryKeys, queryValues, data) {
    try {
        const query = new parse_1.default.Query(className); // Use Parse's actual query type
        for (let i = 0; i < queryKeys.length; i++) {
            query.equalTo(queryKeys[i], queryValues[i]);
        }
        let record = await query.first(); // Convert to unknown before asserting
        if (record) {
            // Update existing record
            for (const key in data) {
                record.set(key, data[key]);
            }
            await record.save();
            console.log(`Updated existing ${className} record with ID: ${record.id}`);
        }
        else {
            // Create new record
            const ParseClass = parse_1.default.Object.extend(className);
            record = new ParseClass();
            for (const key in data) {
                record.set(key, data[key]);
            }
            await record.save();
            console.log(`Created new ${className} record with ID: ${record.id}`);
        }
        return record;
    }
    catch (error) {
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
async function getRecordById(className, objectId) {
    try {
        const query = new parse_1.default.Query(className); // Use Parse's actual query type
        const record = await query.get(objectId); // Convert to unknown before asserting
        return record;
    }
    catch (error) {
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
async function getRecords(className, queryKeys, queryValues) {
    try {
        const query = new parse_1.default.Query(className); // Use Parse's actual query type
        if (queryKeys && queryValues) {
            for (let i = 0; i < queryKeys.length; i++) {
                query.equalTo(queryKeys[i], queryValues[i]);
            }
        }
        const records = await query.find(); // Convert to unknown before asserting
        return records;
    }
    catch (error) {
        console.error(`Error getting ${className} records:`, error);
        return [];
    }
}
async function createSchemas(schemaNames) {
    try {
        for (const schemaName of schemaNames) {
            const schema = new parse_1.default.Schema(schemaName);
            console.log(`Created schema: ${schemaName}`);
            //await schema.create();
        }
    }
    catch (error) {
        console.error(`Error creating schemas:`, error);
    }
}
async function getAllSchemas() {
    try {
        const schemas = await parse_1.default.Schema.all();
        return schemas.map((schema) => schema.className);
    }
    catch (error) {
        console.error(`Error getting all schemas:`, error);
        return [];
    }
}
async function deleteSchema(schemaName) {
    try {
        const schema = new parse_1.default.Schema(schemaName);
        await schema.delete();
        console.log(`Deleted schema: ${schemaName}`);
    }
    catch (error) {
        console.error(`Error deleting schema ${schemaName}:`, error);
    }
}
async function deleteSchemas(schemaNames) {
    try {
        for (const schemaName of schemaNames) {
            await deleteSchema(schemaName);
        }
    }
    catch (error) {
        console.error(`Error deleting schemas:`, error);
    }
}
async function getAllRecords(className) {
    try {
        const query = new parse_1.default.Query(className);
        const records = await query.find(); // Convert to unknown before asserting
        return records;
    }
    catch (error) {
        console.error(`Error getting all ${className} records:`, error);
        return [];
    }
}
async function deleteAllRecords(className) {
    try {
        const records = await getAllRecords(className);
        for (const record of records) {
            await record.destroy();
        }
        console.log(`Deleted all ${className} records.`);
    }
    catch (error) {
        console.error(`Error deleting all ${className} records:`, error);
    }
}
async function deleteRecordById(className, objectId) {
    try {
        const record = await getRecordById(className, objectId);
        if (record) {
            await record.destroy();
            console.log(`Deleted ${className} record with ID: ${objectId}`);
        }
        else {
            console.log(`No ${className} record found with ID: ${objectId}`);
        }
    }
    catch (error) {
        console.error(`Error deleting ${className} record with ID ${objectId}:`, error);
    }
}
async function deleteRecordsByIds(className, objectIds) {
    try {
        for (const objectId of objectIds) {
            await deleteRecordById(className, objectId);
        }
    }
    catch (error) {
        console.error(`Error deleting ${className} records with IDs ${objectIds}:`, error);
    }
}
async function deleteAllSchemas() {
    try {
        const schemaNames = await getAllSchemas();
        await deleteSchemas(schemaNames);
    }
    catch (error) {
        console.error(`Error deleting all schemas:`, error);
    }
}
/**
 * create a record in the parse database. Throws an error if the record already exists
 * @param collectionName
 * @param collectionIdFields
 * @param collectionIdsValues
 * @returns {Promise<Parse.Object>}
 */
async function createRecord(collectionName, collectionIdFields = [], collectionIdsValues = [], data = {}) {
    try {
        const Collection = parse_1.default.Object.extend(collectionName);
        const query = new parse_1.default.Query(Collection);
        if (collectionIdFields && collectionIdFields.length > 0) {
            collectionIdFields.forEach((cif, i) => query.equalTo(cif, collectionIdsValues[i]));
            const record = await query.first();
            if (record) {
                throw new Error('Record already exists');
            }
            else {
                const newRecord = new Collection();
                return newRecord.save(data);
            }
        }
        else {
            const newRecord = new Collection();
            return newRecord.save(data);
        }
    }
    catch (e) {
        console.log(`createRecord: Error creating record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIdsValues ${collectionIdsValues}  ${e.message}`);
    }
}
async function createRecords(collectionName, collectionIdFields = [], collectionIdsValues = [], data = {}) {
    try {
        const Collection = parse_1.default.Object.extend(collectionName);
        const query = new parse_1.default.Query(Collection);
        if (collectionIdFields.length > 0) {
            for (let i = 0; i < collectionIdFields.length; i++) {
                if (typeof collectionIdsValues[i] == "object" && collectionIdsValues[i].length > 0) {
                    query.containedIn(collectionIdFields[i], collectionIdsValues[i]);
                }
                else {
                    // filter out any undefined values
                    query.equalTo(collectionIdFields[i], collectionIdsValues[i]);
                }
            }
            const record = await query.first();
            if (record) {
                throw new Error('Collection contains existing records!');
            }
            else {
                return parse_1.default.Object.saveAll(data);
                ;
            }
        }
        else {
            return parse_1.default.Object.saveAll(data);
            ;
        }
    }
    catch (e) {
        console.log(`createRecords: Error creating record with collectionName ${collectionName} and collectionIdFields ${collectionIdFields} and collectionIdsValues ${collectionIdsValues}  ${e.message}\n`, e);
    }
}
