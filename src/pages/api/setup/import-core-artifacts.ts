// src/pages/api/setup/import-core-artifacts.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';
import path from 'path';
import fs from 'fs/promises';

// Initialize Parse SDK with master key for server-side operations
if (!Parse.applicationId) {
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID || 'gemcms_dev';
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY || 'gemcms_js_key_dev';
  const masterKey = process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev';
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || 'http://localhost:1337/parse';

  Parse.initialize(appId, jsKey, masterKey);
  Parse.serverURL = serverURL;
}

// Import network configurations
import evmNetworks from '../../../config/evmNetworks.json';

type ImportArtifactsResponse = {
  success: boolean;
  message?: string;
  imported?: any[];
  failed?: any[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportArtifactsResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Master key is required for this operation
  if (req.headers['x-parse-master-key'] !== process.env.PARSE_MASTER_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Master key required.' });
  }

  try {
    const deploymentNetworkName = process.env.NEXT_PUBLIC_PRIMARY_DEPLOYMENT_NETWORK_NAME;
    if (!deploymentNetworkName) {
      throw new Error('NEXT_PUBLIC_PRIMARY_DEPLOYMENT_NETWORK_NAME environment variable is not set.');
    }

    const targetNetwork = evmNetworks.find(net => net.id === deploymentNetworkName);
    if (!targetNetwork) {
      throw new Error(`Network configuration not found for: ${deploymentNetworkName}`);
    }

    const deploymentsPath = path.join(process.cwd(), 'src', 'config', 'evm-deployments', deploymentNetworkName);
    let artifactsData: { artifactName: string; artifactContent: string }[] = [];

    try {
      const files = await fs.readdir(deploymentsPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(deploymentsPath, file);
          const artifactContent = await fs.readFile(filePath, 'utf-8');
          artifactsData.push({
            artifactName: path.parse(file).name,
            artifactContent: artifactContent,
          });
        }
      }
    } catch (fsError: any) {
      if (fsError.code === 'ENOENT') {
        console.warn(`Deployment directory not found for network ${deploymentNetworkName}: ${deploymentsPath}. Skipping artifact import.`);
        artifactsData = []; // No deployments to import
      } else {
        throw fsError;
      }
    }

    if (artifactsData.length === 0) {
      return res.status(200).json({ success: true, message: `No artifacts found for network ${deploymentNetworkName}.` });
    }

    // Call the cloud function to import artifacts
    const importResult = await Parse.Cloud.run('importCoreSystemArtifactsBatch', {
      artifactsData,
      targetNetworkName: targetNetwork.id,
      targetNetworkId: targetNetwork.chainId, // Use chainId for targetNetworkId
      rpcUrl: targetNetwork.rpcUrl,
      explorerUrl: targetNetwork.blockExplorerUrl,
    }, { useMasterKey: true });

    if (importResult.success) {
      // Update PlatformConfig after successful import
      try {
        await Parse.Cloud.run('updatePlatformConfig', {
          updates: {
            currentState: 'CORE_ARTIFACTS_IMPORTED',
            coreContractsImportedForNetwork: deploymentNetworkName,
            coreFactoryAddresses: importResult.factoryAddresses,
            lastSetupError: null,
            setupCompletedAt: new Date(),
          }
        }, { useMasterKey: true });
        console.log(`PlatformConfig updated to CORE_ARTIFACTS_IMPORTED for ${deploymentNetworkName}.`);
      } catch (configError) {
        console.error('Failed to update PlatformConfig after artifact import:', configError);
        // Do not fail the overall import if config update fails
      }

      return res.status(200).json({
        success: true,
        message: `Successfully imported core artifacts for ${deploymentNetworkName}.`,
        imported: importResult.imported,
        failed: importResult.failed,
      });
    } else {
      throw new Error(importResult.error || 'Failed to import core artifacts via Cloud Function.');
    }

  } catch (error: any) {
    console.error('API /api/setup/import-core-artifacts error:', error);
    
    // Attempt to update PlatformConfig with error state
    try {
      await Parse.Cloud.run('updatePlatformConfig', {
        updates: {
          currentState: 'ERROR',
          lastSetupError: error.message || 'Unknown error during artifact import.',
        }
      }, { useMasterKey: true });
    } catch (configError) {
      console.error('Failed to update PlatformConfig with error state after artifact import failure:', configError);
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'An unexpected error occurred during artifact import.',
    });
  }
}