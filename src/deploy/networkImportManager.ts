/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { getOrCreateRecord } from '@/parse/parseService';
import { NetworkDeploymentData, BlockchainParseObject } from './interfaces';
import { readAbisFromDeploymentsFolder } from './artifactProcessing';
import { getOrganizationById, createProjectFor, createDeploymentForProject } from './recordManagement';
import { importDeploymentArtifact } from './artifactImporters'; // Assuming this is the main artifact importer

function getAlchemyRpcUrl(networkName: string): string | undefined {
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY; // Assuming this is set as a public env variable
  if (!apiKey) {
    console.warn("ALCHEMY_API_KEY environment variable is not set. Cannot generate Alchemy RPC URL.");
    return undefined;
  }

  // Map network names to Alchemy network subdomains
  const networkMap: { [key: string]: string } = {
    mainnet: "eth-mainnet",
    goerli: "eth-goerli",
    sepolia: "eth-sepolia",
    polygon: "polygon-mainnet",
    mumbai: "polygon-mumbai",
    arbitrum: "arb-mainnet",
    arbitrumsepolia: "arb-sepolia",
    optimism: "opt-mainnet",
    optimismsepolia: "opt-sepolia",
    basesep: "base-sepolia", // Add base sepolia
    base: "base-mainnet", // Add base mainnet
    // Add more networks as needed
  };

  const subdomain = networkMap[networkName.toLowerCase()];
  if (!subdomain) {
    console.warn(`Unknown network: ${networkName}. Cannot generate Alchemy RPC URL.`);
    return undefined;
  }

  return `https://${subdomain}.g.alchemy.com/v2/${apiKey}`;
}

export function getChainId(networkFolderPath: string, networkFolder: string): number {
  const filePath = path.join(networkFolderPath, networkFolder, '.chainId');
  const chainId = parseInt(fs.readFileSync(filePath, { encoding: 'utf8' }));
  if (isNaN(chainId)) {
    throw new Error(`Could not parse chain ID from .chainId file for network ${networkFolder}`);
  }
  return chainId;
}

export async function importDeploymentArtifactsForNetwork(
  networkName: string,
  networkDeployments: NetworkDeploymentData[],
  organizationId: string,
  projectName: string,
  rpcUrl: string // Added rpcUrl as it's needed by importDeploymentArtifact
): Promise<void> {
  console.log(`Importing deployments for network: ${networkName}`);

  const organization = await getOrganizationById(organizationId);
  if (!organization) {
    console.error(`Organization with ID ${organizationId} not found. Cannot import deployments.`);
    return;
  }

  const project = await createProjectFor(projectName, organization);
  if (!project) {
    console.error(`Failed to create or retrieve project ${projectName}.`);
    return;
  }

  const deployment = await createDeploymentForProject(project, `Deployment ${networkName}`, `Hardhat deployment for ${networkName}`);
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


  const blockchain = await getOrCreateRecord(
    'Blockchain',
    ['networkId'],
    [networkIdToUse],
    {
      name: networkName,
      chainId: networkIdToUse, // Ensure this is a number
      networkName: networkName,
      rpcUrl: rpcUrl, // Use the provided rpcUrl
      explorerUrl: `https://${networkName}.etherscan.io`, // Placeholder
      isActive: true,
    }
  ) as BlockchainParseObject | undefined;

  if (!blockchain) {
    console.error(`Failed to create or retrieve Blockchain record for network ${networkName}.`);
    return;
  }

  const promises = networkDeployments.map(async (deploymentRecord: NetworkDeploymentData) => {
    try {
      // Pass rpcUrl to importDeploymentArtifact
      await importDeploymentArtifact(deploymentRecord, blockchain, project, deployment, rpcUrl);
    } catch (error) {
      console.error(`Error importing artifact ${deploymentRecord.name} for network ${networkName}:`, error);
    }
  });

  await Promise.all(promises);
  console.log(`Finished importing deployments for network: ${networkName}`);
}

export async function importHardhatDeploymentsForOrganization(organizationId: string, deploymentsFolderPath: string, fallbackRpcUrl?: string): Promise<void> {
  console.log(`Importing Hardhat deployments for organization ${organizationId} from ${deploymentsFolderPath}`);

  const deploymentsByNetwork = await readAbisFromDeploymentsFolder(deploymentsFolderPath);

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
      
      let rpcUrl = getAlchemyRpcUrl(networkName);
      if (!rpcUrl) {
        // If Alchemy URL cannot be generated, try fallbackRpcUrl
        if (fallbackRpcUrl) {
          rpcUrl = fallbackRpcUrl;
          console.warn(`Using installer-provided fallback RPC URL for ${networkName}: ${rpcUrl}`);
        } else {
          // Fallback to artifact RPC URL or localhost if no other option
          rpcUrl = networkDeployments[0].artifact.rpcUrl || 'http://localhost:8545';
          console.warn(`Using artifact/default fallback RPC URL for ${networkName}: ${rpcUrl}`);
        }
      }

      await importDeploymentArtifactsForNetwork(networkName, networkDeployments, organizationId, `Default Project for ${networkName}`, rpcUrl);
    }
  }

  console.log(`Finished importing Hardhat deployments for organization ${organizationId}.`);
}