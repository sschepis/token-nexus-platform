import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

/**
 * Internal API endpoint to update platform state after successful setup
 * This should only be called by the setup completion process
 */

// Initialize Parse SDK with master key for server-side operations
if (!Parse.applicationId) {
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID || 'gemcms_dev';
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY || 'gemcms_js_key_dev';
  const masterKey = process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev';
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || 'http://localhost:1337/parse';

  Parse.initialize(appId, jsKey, masterKey);
  Parse.serverURL = serverURL;
}

/**
 * Internal API endpoint to update platform state after successful setup
 * This should only be called by the setup completion process
 *
 * NOTE: This endpoint now persists state to the database using the PlatformConfig Parse object.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
    const { status, parentOrgId } = req.body;
    
    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }
    
    const updates: any = { // Use 'any' type for updates for flexibility
      currentState: status,
      lastSetupError: null,
      platformVersion: '1.0.0', // Assuming a default for now. This could come from env or other config.
      setupCompletedAt: new Date(),
    };

    if (parentOrgId) {
      updates.parentOrgId = parentOrgId;
    }

    if (status === 'CORE_ARTIFACTS_IMPORTED') {
      updates.coreContractsImportedForNetwork = process.env.NEXT_PUBLIC_PRIMARY_DEPLOYMENT_NETWORK_NAME || 'basesep'; // Use env variable for network name when available
    }

    // Call the cloud function to update PlatformConfig
    await Parse.Cloud.run('updatePlatformConfig', { updates }, { useMasterKey: true });

    return res.status(200).json({
      success: true,
      message: `Platform state updated to ${status}.`
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Update platform state error:', errorMessage);
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}