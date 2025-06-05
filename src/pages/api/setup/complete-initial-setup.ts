import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

// Initialize Parse SDK with master key for server-side operations
if (!Parse.applicationId) {
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID || 'gemcms_dev';
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY || 'gemcms_js_key_dev';
  const masterKey = process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev';
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || 'http://localhost:1337/parse';

  // Parse SDK Initialization - removed debug logging for production

  Parse.initialize(appId, jsKey, masterKey);
  Parse.serverURL = serverURL;
}

type CompleteSetupResponse = {
  success: boolean;
  message?: string;
  parentOrgId?: string;
  adminUserId?: string;
  error?: string;
};

interface CompleteSetupRequestBody {
  parentOrgName: string;
  adminUserEmail: string;
  adminUserPassword?: string;
  adminUserFirstName?: string;
  adminUserLastName?: string;
  bootstrapToken?: string;
}

interface CloudSetupResult {
  success: boolean;
  message?: string;
  parentOrgId?: string;
  adminUserId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompleteSetupResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // No bootstrap token required for local development setup

  const {
    parentOrgName,
    adminUserEmail,
    adminUserPassword,
    adminUserFirstName,
    adminUserLastName,
  } = req.body as CompleteSetupRequestBody;

  if (!parentOrgName || !adminUserEmail || !adminUserPassword) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: parentOrgName, adminUserEmail, adminUserPassword.' 
    });
  }

  try {
    // First, update platform state to PARENT_ORG_CREATING before starting setup
    const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || 'http://localhost:1337/parse';
    const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID || 'gemcms_dev';
    const masterKey = process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev';
    
    try {
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      const updateStateResponse = await fetch(`${baseUrl}/api/setup/update-platform-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Parse-Master-Key': masterKey,
        },
        body: JSON.stringify({
          status: 'PARENT_ORG_CREATING',
          message: 'Starting parent organization creation'
        }),
      });
      
      if (!updateStateResponse.ok) {
        console.warn('Failed to update platform state to PARENT_ORG_CREATING, continuing anyway');
      }
    } catch (stateError) {
      console.warn('Error updating platform state to PARENT_ORG_CREATING:', stateError);
      // Don't fail the setup if state update fails
    }

    const cloudFunctionParams = {
      parentOrgName,
      adminUserEmail,
      adminUserPassword, // Don't mask the actual password being sent
      adminUserFirstName,
      adminUserLastName,
      defaultPlanType: process.env.DEFAULT_PARENT_ORG_PLAN_TYPE || 'enterprise',
    };
    
    // Use a Cloud Function to handle the privileged operations
    // This ensures all privileged operations are on the server side with proper auth
    // Call the cloud function with master key using REST API
    
    const response = await fetch(`${serverURL}/functions/completeInitialPlatformSetup`, {
      method: 'POST',
      headers: {
        'X-Parse-Application-Id': appId,
        'X-Parse-Master-Key': masterKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cloudFunctionParams),
    });

    if (!response.ok) {
      throw new Error(`Cloud function call failed: ${response.status} ${response.statusText}`);
    }

    const setupResultResponse = await response.json() as { result: CloudSetupResult };
    const setupResult = setupResultResponse.result;

    if (setupResult && setupResult.success) {
      // Platform state is now updated directly by the cloud function to OPERATIONAL
      // No need for additional state update here
      
      return res.status(200).json({
        success: true,
        message: setupResult.message,
        parentOrgId: setupResult.parentOrgId,
        adminUserId: setupResult.adminUserId,
      });
    } else {
      throw new Error(setupResult?.message || 'Failed to complete platform setup in Cloud Function.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Setup API Error:', errorMessage);
    
    return res.status(500).json({ 
      success: false, 
      error: errorMessage || 'An unexpected error occurred during setup.' 
    });
  }
}