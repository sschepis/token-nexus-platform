import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

interface DeploymentInfo {
  networkName: string;
  chainId: string;
  contractCount: number;
  contracts: Array<{
    contractName: string;
    address: string;
  }>;
}

interface ImportedContract {
  contractName: string;
  address: string;
}

interface ImportStatus {
  isImported: boolean;
  importedAt?: string;
  importedContracts?: number;
  lastError?: string;
  contracts?: ImportedContract[]; // Add an array to store imported contract details
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Check for deployment artifacts in src/config/evm-deployments
    const deploymentsPath = path.join(process.cwd(), 'src', 'config', 'evm-deployments');
    
    let deploymentInfo: DeploymentInfo | null = null;
    
    try {
      const deploymentDirs = await fs.readdir(deploymentsPath);
      const networkDirResults = await Promise.all(
        deploymentDirs.map(async (dir) => {
          const dirPath = path.join(deploymentsPath, dir);
          try {
            const stat = await fs.stat(dirPath);
            return stat.isDirectory() ? dir : null;
          } catch (e) {
            return null; // Ignore if stat fails (e.g., not a directory or invalid path)
          }
        })
      );
      const networkDirs = networkDirResults.filter(Boolean);
      
      if (networkDirs.length > 0) {
        // Take the first network directory (assuming single deployment as per requirements)
        const networkName = networkDirs[0];
        const networkPath = path.join(deploymentsPath, networkName);
        
        // Read chain ID
        let chainId = 'unknown';
        try {
          const chainIdPath = path.join(networkPath, '.chainId');
          chainId = (await fs.readFile(chainIdPath, 'utf-8')).trim();
        } catch (error) {
          console.warn('Could not read chain ID:', error);
        }
        
        // Read index.json for contract list
        let contracts: Array<{ contractName: string; address: string }> = [];
        try {
          const indexPath = path.join(networkPath, 'index.json');
          const indexContent = await fs.readFile(indexPath, 'utf-8');
          const indexData = JSON.parse(indexContent);
          contracts = indexData.contracts || [];
        } catch (error) {
          console.warn('Could not read index.json:', error);
          
          // Fallback: scan for .json files (excluding solcInputs directory)
          const files = await fs.readdir(networkPath);
          const contractFiles = files.filter(file => 
            file.endsWith('.json') && 
            file !== 'index.json' && 
            !file.startsWith('.')
          );
          
          const contractPromises = contractFiles.map(async (file) => {
            const contractFilePath = path.join(networkPath, file);
            const contractContent = await fs.readFile(contractFilePath, 'utf-8');
            const contractData = JSON.parse(contractContent);
            return {
              contractName: file.replace('.json', ''),
              address: contractData.address || '0x0000000000000000000000000000000000000000', // Use actual address or placeholder
            };
          });
          contracts = await Promise.all(contractPromises);
        }
        
        deploymentInfo = {
          networkName,
          chainId,
          contractCount: contracts.length,
          contracts
        };
      }
    } catch (error) {
      console.warn('Could not read deployments directory:', error);
    }
    
    // Check import status from database/platform state
    // For now, we'll use a simple file-based approach
    let importStatus: ImportStatus = {
      isImported: false,
      contracts: []
    };
    
    try {
      const importStatusPath = path.join(process.cwd(), '.deployment-import-status');
      const statusContent = await fs.readFile(importStatusPath, 'utf-8');
      const statusData = JSON.parse(statusContent);
      
      if (statusData.networkName === deploymentInfo?.networkName) {
        importStatus = {
          isImported: statusData.isImported || false,
          importedAt: statusData.importedAt,
          importedContracts: statusData.importedContracts,
          lastError: statusData.lastError,
          contracts: statusData.contracts || [] // Populate imported contracts array
        };
      }
    } catch (error) {
      // File doesn't exist or can't be read - deployment not imported
    }
    
    return res.status(200).json({
      deployment: deploymentInfo,
      importStatus
    });
    
  } catch (error) {
    console.error('Error checking deployment status:', error);
    return res.status(500).json({
      error: 'Failed to check deployment status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}