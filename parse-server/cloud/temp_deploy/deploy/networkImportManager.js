"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChainId = getChainId;
exports.importDeploymentArtifactsForNetwork = importDeploymentArtifactsForNetwork;
exports.importHardhatDeploymentsForOrganization = importHardhatDeploymentsForOrganization;
/* eslint-disable @typescript-eslint/no-explicit-any */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parseService_1 = require("@/parse/parseService");
const artifactProcessing_1 = require("./artifactProcessing");
const recordManagement_1 = require("./recordManagement");
const artifactImporters_1 = require("./artifactImporters"); // Assuming this is the main artifact importer
function getChainId(networkFolderPath, networkFolder) {
    const filePath = path_1.default.join(networkFolderPath, networkFolder, '.chainId');
    const chainId = parseInt(fs_1.default.readFileSync(filePath, { encoding: 'utf8' }));
    if (isNaN(chainId)) {
        throw new Error(`Could not parse chain ID from .chainId file for network ${networkFolder}`);
    }
    return chainId;
}
async function importDeploymentArtifactsForNetwork(networkName, networkDeployments, organizationId, projectName, rpcUrl // Added rpcUrl as it's needed by importDeploymentArtifact
) {
    console.log(`Importing deployments for network: ${networkName}`);
    const organization = await (0, recordManagement_1.getOrganizationById)(organizationId);
    if (!organization) {
        console.error(`Organization with ID ${organizationId} not found. Cannot import deployments.`);
        return;
    }
    const project = await (0, recordManagement_1.createProjectFor)(projectName, organization);
    if (!project) {
        console.error(`Failed to create or retrieve project ${projectName}.`);
        return;
    }
    const deployment = await (0, recordManagement_1.createDeploymentForProject)(project, `Deployment ${networkName}`, `Hardhat deployment for ${networkName}`);
    if (!deployment) {
        console.error(`Failed to create or retrieve deployment for project ${projectName}.`);
        return;
    }
    const firstDeploymentArtifact = networkDeployments[0]?.artifact;
    if (!firstDeploymentArtifact) {
        console.error(`No deployment artifacts found for network ${networkName}.`);
        return;
    }
    const networkIdToUse = networkDeployments[0].networkId;
    const blockchain = await (0, parseService_1.getOrCreateRecord)('Blockchain', ['networkId'], [networkIdToUse], {
        name: networkName,
        chainId: networkIdToUse, // Ensure this is a number
        networkName: networkName,
        rpcUrl: rpcUrl, // Use the provided rpcUrl
        explorerUrl: `https://${networkName}.etherscan.io`, // Placeholder
        isActive: true,
    });
    if (!blockchain) {
        console.error(`Failed to create or retrieve Blockchain record for network ${networkName}.`);
        return;
    }
    const promises = networkDeployments.map(async (deploymentRecord) => {
        try {
            // Pass rpcUrl to importDeploymentArtifact
            await (0, artifactImporters_1.importDeploymentArtifact)(deploymentRecord, blockchain, project, deployment, rpcUrl);
        }
        catch (error) {
            console.error(`Error importing artifact ${deploymentRecord.name} for network ${networkName}:`, error);
        }
    });
    await Promise.all(promises);
    console.log(`Finished importing deployments for network: ${networkName}`);
}
async function importHardhatDeploymentsForOrganization(organizationId, deploymentsFolderPath) {
    console.log(`Importing Hardhat deployments for organization ${organizationId} from ${deploymentsFolderPath}`);
    const deploymentsByNetwork = await (0, artifactProcessing_1.readAbisFromDeploymentsFolder)(deploymentsFolderPath);
    if (!deploymentsByNetwork) {
        console.log("No deployments found to import.");
        return;
    }
    for (const networkName in deploymentsByNetwork) {
        if (Object.prototype.hasOwnProperty.call(deploymentsByNetwork, networkName)) {
            const networkDeployments = deploymentsByNetwork[networkName];
            if (networkDeployments.length === 0 || !networkDeployments[0].artifact) {
                console.warn(`No artifacts found for network ${networkName}, skipping.`);
                continue;
            }
            // Determine rpcUrl: use from artifact if present, else default
            const rpcUrl = networkDeployments[0].artifact.rpcUrl || 'http://localhost:8545';
            await importDeploymentArtifactsForNetwork(networkName, networkDeployments, organizationId, `Default Project for ${networkName}`, rpcUrl);
        }
    }
    console.log(`Finished importing Hardhat deployments for organization ${organizationId}.`);
}
