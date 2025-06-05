import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises'; // Keep for writing status file
import path from 'path';
import { importHardhatDeploymentsForOrganization } from '@/deploy/networkImportManager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { networkName, installerRpcUrl } = req.body; // Added installerRpcUrl
    
    if (!networkName) {
      return res.status(400).json({
        error: 'Network name is required'
      });
    }

    // TODO: Retrieve organizationId from the user's session or authentication context.
    // For now, using a placeholder. Replace with actual logic.
    const organizationId = 'YOUR_ORGANIZATION_ID_HERE'; // Replace with actual organization ID

    const deploymentsFolderPath = path.join(process.cwd(), 'src', 'config', 'evm-deployments');

    try {
      console.log(`Starting import for network: ${networkName} for organization: ${organizationId}`);
      await importHardhatDeploymentsForOrganization(organizationId, deploymentsFolderPath, installerRpcUrl); // Pass installerRpcUrl
      console.log(`Successfully completed import for network: ${networkName}`);

      // Simulate fetching chainId and contracts for status update - this is usually part of importHardhatDeploymentsForOrganization
      // For now, we'll manually try to read it to update the status file as the frontend expects it.
      let chainId = 'unknown';
      let importedContracts = 0;
      
      const networkPath = path.join(deploymentsFolderPath, networkName);
      try {
        const chainIdPath = path.join(networkPath, '.chainId');
        chainId = (await fs.readFile(chainIdPath, 'utf-8')).trim();
      } catch (error) {
        console.warn(`Could not read chain ID for network ${networkName} for status update:`, error);
      }

      try {
        const indexPath = path.join(networkPath, 'index.json');
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        const indexData = JSON.parse(indexContent);
        importedContracts = (indexData.contracts || []).length;
      } catch (error) {
        console.warn(`Could not read index.json for network ${networkName} for status update:`, error);
        // Fallback to counting json files if index.json is not present
        const files = await fs.readdir(networkPath);
        const contractFiles = files.filter(file =>
          file.endsWith('.json') &&
          file !== 'index.json' &&
          !file.startsWith('.')
        );
        importedContracts = contractFiles.length;
      }

      // Re-read contracts from deployment directory to get their names and addresses
      // This is a workaround as importHardhatDeploymentsForOrganization doesn't return the list
      let importedContractDetails: { contractName: string; address: string; }[] = [];
      try {
        const networkPathForDetails = path.join(deploymentsFolderPath, networkName);
        const indexPathForDetails = path.join(networkPathForDetails, 'index.json');
        const indexContentForDetails = await fs.readFile(indexPathForDetails, 'utf-8');
        const indexDataForDetails = JSON.parse(indexContentForDetails);
        importedContractDetails = indexDataForDetails.contracts || [];
      } catch (error) {
        console.warn(`Could not re-read index.json for details for network ${networkName}:`, error);
        // Fallback to counting json files if index.json is not present
        const filesForDetails = await fs.readdir(path.join(deploymentsFolderPath, networkName));
        const contractFilesForDetails = filesForDetails.filter(file =>
          file.endsWith('.json') &&
          file !== 'index.json' &&
          !file.startsWith('.')
        );
        for (const file of contractFilesForDetails) {
            try {
                const contractFilePath = path.join(deploymentsFolderPath, networkName, file);
                const contractContent = await fs.readFile(contractFilePath, 'utf-8');
                const contractData = JSON.parse(contractContent);
                importedContractDetails.push({
                    contractName: file.replace('.json', ''),
                    address: contractData.address || '0x0000000000000000000000000000000000000000',
                });
            } catch (innerError) {
                console.warn(`Could not read contract file ${file} for details:`, innerError);
            }
        }
      }

      const importStatus = {
        networkName,
        chainId,
        isImported: true,
        importedAt: new Date().toISOString(),
        importedContracts, // This is count only, we'll use importedContractDetails for list
        contracts: importedContractDetails, // Now includes the actual contract list
      };
      
      const statusPath = path.join(process.cwd(), '.deployment-import-status');
      await fs.writeFile(statusPath, JSON.stringify(importStatus, null, 2));

      return res.status(200).json({
        success: true,
        message: `Successfully imported contracts for network ${networkName}`,
        networkName,
        chainId,
        importedContracts
      });
      
    } catch (error) {
      console.error('Error during Hardhat deployment import:', error);

      // Save error status
      const errorStatus = {
        networkName,
        // chainId might not be available if error happens early
        isImported: false,
        lastError: String(error), // Convert error to string for storage
        errorAt: new Date().toISOString()
      };
      
      try {
        const statusPath = path.join(process.cwd(), '.deployment-import-status');
        await fs.writeFile(statusPath, JSON.stringify(errorStatus, null, 2));
      } catch (writeError) {
        console.error('Could not save error status after import failure:', writeError);
      }
      
      return res.status(500).json({
        error: 'Failed to import deployment',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  } catch (error) {
    console.error('Unhandled error in /api/system-admin/import-deployment:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred during deployment import API handling',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}