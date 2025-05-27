import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

/**
 * Internal API endpoint to update platform state after successful setup
 * This should only be called by the setup completion process
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { status, parentOrgId, message } = req.body;
    
    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }
    
    const platformStateFile = process.env.PLATFORM_STATE_FILE || '.platform-state';
    const stateFilePath = path.join(process.cwd(), platformStateFile);
    
    const stateData = {
      status,
      message: message || `Platform is in ${status} state`,
      coreContractsImportedForNetwork: 'basesep',
      parentOrgId,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(stateFilePath, JSON.stringify(stateData, null, 2));
    
    console.log('Platform state updated:', stateData);
    
    return res.status(200).json({
      success: true,
      state: stateData
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Update platform state error:', errorMessage);
    
    return res.status(500).json({
      error: errorMessage
    });
  }
}