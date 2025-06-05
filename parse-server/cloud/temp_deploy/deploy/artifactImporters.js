"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importDeploymentArtifactAbi = importDeploymentArtifactAbi;
exports.importDeploymentArtifactSourceCode = importDeploymentArtifactSourceCode;
exports.importDeploymentArtifactEventListener = importDeploymentArtifactEventListener;
exports.importDeploymentArtifactSmartContract = importDeploymentArtifactSmartContract;
exports.importDeploymentArtifactDiamondFacet = importDeploymentArtifactDiamondFacet;
exports.importDeploymentArtifactDiamondFactory = importDeploymentArtifactDiamondFactory;
exports.importDeploymentArtifact = importDeploymentArtifact;
/* eslint-disable @typescript-eslint/no-explicit-any */
const parse_1 = __importDefault(require("parse"));
const parseService_1 = require("@/parse/parseService");
const artifactProcessing_1 = require("./artifactProcessing");
// NOTE: recordManagement functions like getOrganizationById, createProjectFor etc.
// are used by networkImportManager, not directly here.
async function importDeploymentArtifactAbi(blockchain, deploymentArtifact) {
    const abiName = deploymentArtifact.get('name');
    const abi = deploymentArtifact.get('abi');
    const abiObject = await (0, parseService_1.getOrCreateRecord)('Abi', ['name', 'network'], [abiName, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
        name: abiName,
        data: abi,
        network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
    });
    if (abiObject) {
        await (0, artifactProcessing_1.parseAbi)(abiObject, abi);
    }
    return abiObject;
}
async function importDeploymentArtifactSourceCode(blockchain, deploymentArtifact) {
    // Assuming 'artifact' property on DeploymentArtifactParseObject holds the JSON data
    const artifactData = deploymentArtifact.get('artifact');
    if (!artifactData || !artifactData.sourceCode)
        return undefined;
    const source = await (0, parseService_1.getOrCreateRecord)('SourceCode', ['address', 'network'], [artifactData.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
        address: artifactData.address,
        name: artifactData.contractName,
        network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
        file: artifactData.sourceCode.file,
        content: artifactData.sourceCode.content,
        keccak256: artifactData.sourceCode.keccak256,
        license: artifactData.sourceCode.license,
    });
    if (source)
        await source.save();
    return source;
}
async function importDeploymentArtifactEventListener(blockchain, project, eventDef, contractAddress) {
    const edName = eventDef.get('name');
    const newRec = await (0, parseService_1.getOrCreateRecord)('EventListener', ['name', 'networkId', 'project'], [edName, blockchain.get('networkId'), { "__type": "Pointer", "className": "Project", "objectId": project.id }], {
        name: edName,
        network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
        networkId: blockchain.get('networkId'),
        definition: { __type: "Pointer", className: "EventDefinition", objectId: eventDef.id },
        address: contractAddress,
        enabled: true,
        project: { __type: "Pointer", className: "Project", objectId: project.id },
    });
    if (newRec)
        await newRec.save();
    return newRec;
}
async function importDeploymentArtifactSmartContract(blockchain, deploymentArtifact, abiObject) {
    const artifactData = deploymentArtifact.get('artifact');
    const smartContract = await (0, parseService_1.getOrCreateRecord)('SmartContract', ['address', 'network'], [artifactData.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
        name: artifactData.contractName,
        address: artifactData.address,
        network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
        abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
        contractType: 'Standard',
        deploymentTransaction: artifactData.transactionHash,
        code: artifactData.contractName.toUpperCase(),
    });
    if (smartContract)
        await smartContract.save();
    return smartContract;
}
async function importDeploymentArtifactDiamondFacet(blockchain, deploymentArtifact, // This might represent the Diamond, not the Facet artifact directly
abiObject, facetAddress, // The actual address of the facet
smartContract // The SmartContract record for the facet
) {
    const artifactData = deploymentArtifact.get('artifact'); // Assuming this is the facet's artifact if available, or use a generic name
    const facetName = smartContract.get('name'); // Use the name from the created SmartContract for the facet
    const diamondFacet = await (0, parseService_1.getOrCreateRecord)('DiamondFacet', ['address', 'network'], [facetAddress, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
        name: facetName, // Use the specific facet's name
        address: facetAddress,
        network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
        abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
        smartContract: { __type: "Pointer", className: "SmartContract", objectId: smartContract.id },
        code: facetName.toUpperCase(), // Use the specific facet's code
    });
    if (diamondFacet)
        await diamondFacet.save();
    return diamondFacet;
}
async function importDeploymentArtifactDiamondFactory(blockchain, deploymentArtifact, // This is the DiamondFactory artifact
abiObject, deployment, smartContract, // This is the SmartContract for the DiamondFactory
rpcUrl) {
    const artifactData = deploymentArtifact.get('artifact');
    const nid = blockchain.get('networkId');
    const diamondFactory = await (0, parseService_1.getOrCreateRecord)('DiamondFactory', ['address', 'network'], [artifactData.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
        networkId: nid,
        abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
        smartContract: { __type: "Pointer", className: "SmartContract", objectId: smartContract.id },
        address: artifactData.address,
        network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
        name: artifactData.contractName,
        code: artifactData.contractName.toUpperCase(),
        deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
    });
    if (!diamondFactory) {
        console.error(`Failed to create or update DiamondFactory at ${artifactData.address}`);
        return undefined;
    }
    await diamondFactory.save();
    const dfaddress = artifactData.address;
    let _symbols = [];
    try {
        const symbolsResult = await parse_1.default.Cloud.run('getContractSymbols', {
            address: dfaddress,
            abi: JSON.stringify(abiObject.get('data')),
            rpcUrl: rpcUrl
        });
        _symbols = symbolsResult.symbols || [];
    }
    catch (error) {
        console.warn(`Could not get symbols from DiamondFactory at ${dfaddress} via cloud function. Skipping diamond processing.`, error);
    }
    for (const symbol of _symbols) {
        let diamondAddress;
        try {
            const diamondAddressResult = await parse_1.default.Cloud.run('getDiamondAddress', {
                address: dfaddress,
                abi: JSON.stringify(abiObject.get('data')),
                rpcUrl: rpcUrl,
                symbol: symbol
            });
            diamondAddress = diamondAddressResult.diamondAddress;
            if (!diamondAddress) {
                console.warn(`Received undefined diamond address for symbol ${symbol} from DiamondFactory at ${dfaddress}. Skipping.`);
                continue;
            }
        }
        catch (error) {
            console.warn(`Could not get diamond address for symbol ${symbol} from DiamondFactory at ${dfaddress} via cloud function. Skipping diamond creation.`, error);
            continue;
        }
        const diamond = await (0, parseService_1.getOrCreateRecord)('Diamond', ['address', 'network'], [diamondAddress, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
            address: diamondAddress,
            symbol: symbol,
            network: { "__type": "Pointer", className: "Blockchain", objectId: blockchain.id },
            diamondFactory: { __type: "Pointer", className: "DiamondFactory", objectId: diamondFactory.id },
        });
        if (diamond)
            await diamond.save();
    }
    return diamondFactory;
}
async function importDeploymentArtifact(deploymentRecord, // This is the raw artifact data from the JSON file
blockchain, project, deployment, rpcUrl) {
    // Create/update the DeploymentArtifact Parse Object first
    const dArtifact = await (0, parseService_1.getOrCreateRecord)('DeploymentArtifact', ['address', 'transactionHash', 'blockchain'], [deploymentRecord.artifact.address, deploymentRecord.artifact.transactionHash || '', { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
        blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
        deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
        // Store the raw artifact JSON directly in the Parse Object
        artifact: deploymentRecord.artifact, // This now holds the JSON: DeploymentArtifactJson
        // Populate other direct fields from the JSON if needed, or rely on artifact.fieldName
        name: deploymentRecord.artifact.contractName, // or deploymentRecord.name
        address: deploymentRecord.artifact.address,
        transactionHash: deploymentRecord.artifact.transactionHash,
        // other direct fields from DeploymentArtifactParseObject that map from DeploymentArtifactJson
        abi: deploymentRecord.artifact.abi,
        args: deploymentRecord.artifact.args,
        receipt: deploymentRecord.artifact.receipt,
        solcInputHash: deploymentRecord.artifact.solcInputHash,
        deployedBytecode: deploymentRecord.artifact.deployedBytecode,
        libraries: deploymentRecord.artifact.libraries,
        storageLayout: deploymentRecord.artifact.storageLayout,
        metadata: deploymentRecord.artifact.metadata,
        devdoc: deploymentRecord.artifact.devdoc,
        userdoc: deploymentRecord.artifact.userdoc,
        // sourceCode and rpcUrl are part of DeploymentArtifactJson, accessed via dArtifact.get('artifact').sourceCode
    });
    if (!dArtifact) {
        console.error(`Failed to create or update DeploymentArtifact for ${deploymentRecord.artifact.contractName} at ${deploymentRecord.artifact.address}`);
        return undefined;
    }
    await dArtifact.save();
    // Now use dArtifact (which holds the artifact JSON in its 'artifact' field) for subsequent imports
    const artifactJson = dArtifact.get('artifact');
    const abiObject = await importDeploymentArtifactAbi(blockchain, dArtifact); // dArtifact.get('abi') is used by this func
    if (!abiObject) {
        console.error(`Failed to import ABI for ${artifactJson.contractName}`);
        return undefined;
    }
    const smartContract = await importDeploymentArtifactSmartContract(blockchain, dArtifact, abiObject);
    if (!smartContract) {
        console.error(`Failed to import SmartContract for ${artifactJson.contractName}`);
        return undefined;
    }
    if (artifactJson.devdoc) {
        await (0, parseService_1.getOrCreateRecord)('Devdoc', ['artifact'], [{ "__type": "Pointer", "className": "DeploymentArtifact", "objectId": dArtifact.id }], {
            blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
            deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
            artifact: { __type: "Pointer", className: "DeploymentArtifact", objectId: dArtifact.id },
            data: artifactJson.devdoc,
        });
    }
    if (artifactJson.userdoc) {
        await (0, parseService_1.getOrCreateRecord)('Userdoc', ['artifact'], [{ "__type": "Pointer", "className": "DeploymentArtifact", "objectId": dArtifact.id }], {
            blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
            deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
            artifact: { __type: "Pointer", className: "DeploymentArtifact", objectId: dArtifact.id },
            data: artifactJson.userdoc,
        });
    }
    if (artifactJson.deployedBytecode) {
        await (0, parseService_1.getOrCreateRecord)('Bytecode', ['address', 'network'], [artifactJson.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
            blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
            deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
            abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
            bytecode: artifactJson.deployedBytecode,
            contractName: artifactJson.contractName,
            name: artifactJson.name, // Assuming name exists on artifactJson
            address: artifactJson.address,
        });
    }
    if (artifactJson.sourceCode) { // Check on artifactJson
        await importDeploymentArtifactSourceCode(blockchain, dArtifact); // This function expects dArtifact
    }
    if (artifactJson.contractName === 'DiamondFactory') {
        await importDeploymentArtifactDiamondFactory(blockchain, dArtifact, abiObject, deployment, smartContract, rpcUrl);
    }
    const eventDefs = await (0, parseService_1.getRecords)('EventDefinition', ['abi'], [{ "__type": "Pointer", "className": "Abi", "objectId": abiObject.id }]);
    for (const ed of eventDefs) {
        await importDeploymentArtifactEventListener(blockchain, project, ed, artifactJson.address);
    }
    return dArtifact;
}
