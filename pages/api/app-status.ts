import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * App status API endpoint that doesn't require authentication
 * Returns a simple status without any Parse dependencies
 */

// Force recompile - timestamp: ${new Date().toISOString()}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log('API app-status: Returning platform status...');
    
    // Check if we have a stored platform state (this would be set after initial setup)
    const platformStateFile = process.env.PLATFORM_STATE_FILE || '.platform-state';
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      // Try to read the platform state file
      const stateFilePath = path.join(process.cwd(), platformStateFile);
      const stateData = await fs.readFile(stateFilePath, 'utf-8');
      const state = JSON.parse(stateData);
      
      console.log('Found existing platform state:', state.status);
      
      return res.status(200).json({
        status: state.status || 'OPERATIONAL',
        message: state.message || 'Platform is operational',
        coreContractsImportedForNetwork: state.coreContractsImportedForNetwork || 'basesep',
        parentOrgId: state.parentOrgId,
        timestamp: new Date().toISOString()
      });
    } catch (fileError) {
      // If file doesn't exist or can't be read, assume we need initial setup
      console.log('No platform state file found, returning PRISTINE for initial setup');
      
      return res.status(200).json({
        status: 'PRISTINE',
        message: 'Initial setup required - create organization and admin',
        coreContractsImportedForNetwork: 'basesep',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('API app-status error:', errorMessage);
    
    return res.status(500).json({
      status: 'ERROR',
      error: errorMessage
    });
  }
}