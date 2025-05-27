import { DeployedContract } from '@/components/system-admin/deployments/EVMContractsManager'; // Assuming DeployedContract type is exported

// Define a type for the network object structure
interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
}

// Define the expected structure of the deployment JSON files
interface DeploymentJson {
  contractName: string;
  address: string;
  // Add other expected fields from your deployment JSONs here if needed
  // abi?: any;
  // transactionHash?: string;
}

/**
 * Loads and parses EVM contract deployment JSON files for a given network.
 * Uses Next.js compatible static imports instead of dynamic template literals.
 *
 * @param network The network configuration object.
 * @returns A promise resolving to an array of DeployedContract objects.
 */
export const loadDeployedContracts = async (network: NetworkConfig): Promise<DeployedContract[]> => {
  console.log(`Attempting to load contracts for network: ${network.id}`);

  const contracts: DeployedContract[] = [];

  try {
    // Create a mapping of known networks and their contract loaders
    // This avoids dynamic template literal imports which can cause bundling issues
    const networkContractLoaders: Record<string, () => Promise<DeployedContract[]>> = {
      'basesep': async () => {
        const contractsFromFiles: DeployedContract[] = [];
        
        // Load known contract files for basesep network
        try {
          const erc721aLib = await import('@/config/evm-deployments/basesep/ERC721ALib.json');
          if (erc721aLib.default?.address) {
            contractsFromFiles.push({
              contractName: 'ERC721ALib',
              address: erc721aLib.default.address,
              blockExplorerUrl: `${network.blockExplorerUrl}/address/${erc721aLib.default.address}`
            });
          }
        } catch (error) {
          console.debug('ERC721ALib.json not found for basesep');
        }

        try {
          const trustedIssuersRegistry = await import('@/config/evm-deployments/basesep/TrustedIssuersRegistryFacet.json');
          if (trustedIssuersRegistry.default?.address) {
            contractsFromFiles.push({
              contractName: 'TrustedIssuersRegistryFacet',
              address: trustedIssuersRegistry.default.address,
              blockExplorerUrl: `${network.blockExplorerUrl}/address/${trustedIssuersRegistry.default.address}`
            });
          }
        } catch (error) {
          console.debug('TrustedIssuersRegistryFacet.json not found for basesep');
        }

        return contractsFromFiles;
      }
    };

    // Use the network-specific loader if available
    const networkLoader = networkContractLoaders[network.id];
    if (networkLoader) {
      const networkContracts = await networkLoader();
      contracts.push(...networkContracts);
    } else {
      console.debug(`No contract loader defined for network: ${network.id}`);
    }

    // Additionally, try to load from a manifest file if it exists
    try {
      // Only attempt to load manifest for known networks
      if (network.id === 'basesep') {
        try {
          const manifestModule = await import('@/config/evm-deployments/basesep/index.json');
          if (manifestModule?.default?.contracts) {
            const manifest = manifestModule.default;
            for (const contractInfo of manifest.contracts) {
              if (contractInfo.address && contractInfo.contractName) {
                // Avoid duplicates
                const exists = contracts.some(c => c.address === contractInfo.address);
                if (!exists) {
                  contracts.push({
                    contractName: contractInfo.contractName,
                    address: contractInfo.address,
                    blockExplorerUrl: `${network.blockExplorerUrl}/address/${contractInfo.address}`
                  });
                }
              }
            }
          }
        } catch (error) {
          console.debug('No manifest file found for basesep network');
        }
      }
    } catch (error) {
      console.debug(`Error loading manifest for network ${network.id}:`, error);
    }

  } catch (error) {
    console.error(`Failed to load contracts for network ${network.id}:`, error);
  }

  console.log(`Loaded ${contracts.length} contracts for network: ${network.id}`);
  return contracts;
};