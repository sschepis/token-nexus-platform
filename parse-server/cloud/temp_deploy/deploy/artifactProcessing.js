"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAbi = parseAbi;
exports.readAbisFromDeploymentsFolder = readAbisFromDeploymentsFolder;
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parseService_1 = require("@/parse/parseService");
/**
 * use ethers to parse the Abi data into methods and events, then save the EventDefinitions
 * and Methods to the database and associate them with this Abi. Assume ethers is in the global scope
 * @param abiObject
 * @param abiJson
 * @returns
 */
async function parseAbi(abiObject, abiJson) {
    const abiData = abiJson;
    const abiName = abiObject.get('name');
    const methods = []; // Keep any for now as Method structure is not fully defined
    const eventDefinitions = []; // Added type assertion
    const facetEventDefinitions = []; // Keep any for now
    // parse the abi
    for (let i = 0; i < abiData.length; i++) {
        const item = abiData[i];
        if (item.type === 'function') {
            const method = await (0, parseService_1.getOrCreateRecord)('Method', [], [], {
                name: item.name,
                code: abiName + '.' + item.name,
                contractName: abiName,
                abi: { "__type": "Pointer", "className": "Abi", "objectId": abiObject.id },
                inputs: item.inputs,
                outputs: item.outputs,
                stateMutability: item.stateMutability,
                type: item.type,
            });
            methods.push(method);
        }
        else if (item.type === 'event') {
            const isAFacet = false;
            if (!isAFacet) {
                const eventDefinition = await (0, parseService_1.getOrCreateRecord)('EventDefinition', [], [], {
                    name: item.name,
                    code: abiName + '.' + item.name,
                    contractName: abiName,
                    abi: { "__type": "Pointer", "className": "Abi", "objectId": abiObject.id },
                    data: item,
                    inputs: item.inputs,
                    type: item.type,
                });
                eventDefinitions.push(eventDefinition);
            }
            else {
                facetEventDefinitions.push({
                    name: item.name,
                    code: abiName + '.' + item.name,
                    contractName: abiName,
                    abi: { "__type": "Pointer", "className": "Abi", "objectId": abiObject.id },
                    data: item,
                    inputs: item.inputs,
                    type: item.type,
                });
            }
        }
    }
    return { methods, eventDefinitions, facetEventDefinitions };
}
/**
 * Read the network folder to get the deployment files.
 * Made the deployments path a parameter.
 * @param deploymentsPath The path to the Hardhat deployments folder.
 * @returns
 */
async function readAbisFromDeploymentsFolder(deploymentsPath) {
    const deployments = {};
    if (!fs_1.default.existsSync(deploymentsPath)) {
        console.log(`Deployments folder not found at ${deploymentsPath}. Nothing to sync`);
        return undefined;
    }
    const ignoreDeployments = [".DS_Store"];
    const files = fs_1.default.readdirSync(deploymentsPath);
    // iterte through each network subfolder
    files.forEach((file) => {
        if (ignoreDeployments.includes(file))
            return;
        // file is the network name
        const networkName = file;
        // read the .chainId file in the network subfolder
        const filePath = path_1.default.join(deploymentsPath, networkName, '.chainId');
        let networkId;
        try {
            networkId = parseInt(fs_1.default.readFileSync(filePath, { encoding: 'utf8' }));
            if (isNaN(networkId)) {
                console.warn(`Could not parse network ID from .chainId file for network ${networkName}. Skipping.`);
                return;
            }
        }
        catch (error) {
            console.warn(`Could not read .chainId file for network ${networkName}. Skipping.`);
            return;
        }
        // scan the subfolder for all the abi files
        const networkFilesPath = path_1.default.join(deploymentsPath, networkName);
        const networkFiles = fs_1.default.readdirSync(networkFilesPath);
        networkFiles.forEach((networkFile) => {
            // networkFile is the abi file
            if (networkFile.endsWith('.json')) {
                const abiFilePath = path_1.default.join(networkFilesPath, networkFile);
                try {
                    const abi = JSON.parse(fs_1.default.readFileSync(abiFilePath, 'utf8'));
                    if (!deployments[networkName])
                        deployments[networkName] = [];
                    // add the abi to the network's array
                    deployments[networkName].push({
                        name: networkFile.replace('.json', ''),
                        abi: abi.abi,
                        address: abi.address,
                        networkName,
                        networkId,
                        artifact: abi, // Store the full artifact for later use
                    });
                }
                catch (error) {
                    console.warn(`Could not parse JSON file ${abiFilePath}. Skipping.`);
                }
            }
        });
    });
    return deployments;
}
