"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionsToManage = void 0;
exports.createSchema = createSchema;
exports.deleteAllCollections = deleteAllCollections;
/* eslint-disable @typescript-eslint/no-explicit-any */
const parse_1 = __importDefault(require("parse"));
const parseService_1 = require("@/parse/parseService");
exports.collectionsToManage = [
    'Abi',
    'Bytecode',
    'Deployment',
    'DeploymentArtifact',
    'Diamond',
    'DiamondFacet',
    'DiamondFactory',
    'Event',
    'EventDefinition',
    'EventListener',
    'ExternalOrder',
    'Log',
    'Method',
    'Token',
    'Transaction',
    'Organization',
    'Project',
    'SourceCode',
    'Devdoc',
    'Userdoc',
    'Registration',
    'MultiSale',
    'ERC721',
    'ERC1155',
    'ERC20',
    'Configuration',
];
async function createSchema() {
    const schemas = await (0, parseService_1.getAllSchemas)();
    if (schemas) {
        await (0, parseService_1.createSchemas)(exports.collectionsToManage);
        const eventListeners = await (0, parseService_1.getRecords)('EventListener');
        if (eventListeners) {
            const eventListenerNames = eventListeners.map((eventListener) => `${eventListener.get('name')}__e`);
            await (0, parseService_1.createSchemas)(eventListenerNames);
        }
    }
}
async function deleteAllCollections() {
    console.warn("deleteAllCollections is a destructive operation and should be used with extreme caution.");
    const collectionsToDelete = [
        'Abi',
        'Bytecode',
        'Deployment',
        'DeploymentArtifact',
        'Devdoc',
        'Diamond',
        'DiamondFacet',
        'DiamondFactory',
        'Event',
        'EventDefinition',
        'EventListener',
        'ExternalOrder',
        'Log',
        'Method',
        'Token',
        'Transaction',
        'Organization',
        'Project',
        'SourceCode',
        'Userdoc',
        'Registration',
        'MultiSale',
        'ERC721',
        'ERC1155',
        'ERC20',
        'Configuration',
    ];
    collectionsToDelete.forEach(async (collection) => {
        const query = new parse_1.default.Query(collection);
        const records = await query.find();
        await parse_1.default.Object.destroyAll(records);
    });
}
