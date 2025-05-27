import type { NextApiRequest, NextApiResponse } from 'next';
import Parse from 'parse/node';

// Initialize Parse SDK with Master Key for server-side operations
if (!Parse.applicationId) {
  Parse.initialize(
    process.env.NEXT_PUBLIC_PARSE_APP_ID || 'gemcms_dev',
    process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY || 'gemcms_js_key_dev',
    process.env.PARSE_MASTER_KEY || 'gemcms_master_key_dev'  // Include Master Key for server-side operations
  );
  Parse.serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL || 'http://localhost:1337/parse';
}

type BootstrapLoginResponse = {
  success: boolean;
  message?: string;
  bootstrapToken?: string; 
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BootstrapLoginResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  const bootstrapUsername = process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME;
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!bootstrapUsername || !bootstrapPassword) {
    console.error('API bootstrap-login: Bootstrap admin credentials are not configured in .env.');
    return res.status(500).json({ success: false, message: 'Bootstrap authentication is not configured.' });
  }

  if (username === bootstrapUsername && password === bootstrapPassword) {
    try {
      // Check PlatformConfig state using master key
      const PlatformConfig = Parse.Object.extend('PlatformConfig');
      const query = new Parse.Query(PlatformConfig);
      
      // Count PlatformConfig objects with master key
      const configCount = await query.count({ useMasterKey: true });
      
      if (configCount === 0) {
        console.warn('API bootstrap-login: No PlatformConfig found.');
        return res.status(403).json({ success: false, message: 'System not initialized correctly.' });
      }
      
      // For simplicity in the demo, assume we're in the correct state if PlatformConfig exists
      // In production, you would verify the actual state using Cloud Functions with proper authentication

      // Generate a simple token for bootstrap process
      // For production, use a proper JWT with secure signing
      const bootstrapToken = Buffer.from(`${Date.now()}_${username}`).toString('base64');
      
      // Store token in server-side session storage
      // This is for demo purposes - in production use a secure session store
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('bootstrapToken', bootstrapToken);
      }

      console.log('API bootstrap-login: Bootstrap login successful.');
      return res.status(200).json({ 
        success: true, 
        message: 'Bootstrap login successful.',
        bootstrapToken: bootstrapToken
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('API bootstrap-login: Error during platform config check:', errorMessage);
      return res.status(500).json({ success: false, message: `Server error: ${errorMessage}` });
    }
  } else {
    console.warn('API bootstrap-login: Invalid bootstrap credentials attempt.');
    return res.status(401).json({ success: false, message: 'Invalid bootstrap credentials.' });
  }
}