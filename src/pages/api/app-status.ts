import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

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
 * App status API endpoint that doesn't require authentication
 * Returns platform status based on actual database state
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Read platform status from database instead of environment variables
    let platformStatus = 'PRISTINE';
    let parentOrgId = null;
    let coreContractsNetwork = 'basesep';
    
    try {
      // Check if PlatformConfig exists in database
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const query = new Parse.Query(PlatformConfig);
      const config = await query.first({ useMasterKey: true });
      
      if (config) {
        platformStatus = config.get('currentState') || 'PRISTINE';
        parentOrgId = config.get('parentOrgId');
        coreContractsNetwork = config.get('coreContractsImportedForNetwork') || 'basesep';
      }
    } catch (dbError) {
      console.warn('[API app-status] Could not read from database, using PRISTINE state:', dbError);
      // Keep default PRISTINE state if database is not accessible
    }
    
    console.log(`[API app-status] Platform status: ${platformStatus}, Parent Org ID: ${parentOrgId}`);
    
    // Determine status message based on current status
    let message: string;
    switch (platformStatus) {
      case 'OPERATIONAL':
        message = 'Platform is operational';
        break;
      case 'PARENT_ORG_CREATED':
        message = 'Parent organization created, platform operational';
        break;
      case 'CORE_ARTIFACTS_IMPORTED':
        message = 'Core artifacts imported, ready for organization setup';
        break;
      case 'PARENT_ORG_CREATING':
        message = 'Creating parent organization';
        break;
      case 'CORE_ARTIFACTS_IMPORTING':
        message = 'Importing core artifacts';
        break;
      case 'PRISTINE':
      default:
        message = 'Initial setup required - create organization and admin';
        break;
    }
    
    const response = {
      status: platformStatus,
      message,
      coreContractsImportedForNetwork: coreContractsNetwork,
      parentOrgId,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[API app-status] Returning response:`, response);
    
    return res.status(200).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('API app-status error:', errorMessage);
    
    return res.status(500).json({
      status: 'ERROR',
      error: errorMessage
    });
  }
}