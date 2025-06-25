// src/services/initialization/parseInitialization.ts
import Parse from 'parse';

/**
 * Initializes the Parse SDK with environment variables.
 * Throws an error if required environment variables are missing or Parse initialization fails.
 */
export async function initializeParse(): Promise<void> {
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID as string | undefined;
  const jsKey = process.env.NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY as string | undefined;
  const serverURL = process.env.NEXT_PUBLIC_PARSE_SERVER_URL as string | undefined;

  if (!appId || !jsKey || !serverURL) {
    const missingVars = [
      !appId ? 'NEXT_PUBLIC_PARSE_APP_ID' : null,
      !jsKey ? 'NEXT_PUBLIC_PARSE_JAVASCRIPT_KEY' : null,
      !serverURL ? 'NEXT_PUBLIC_PARSE_SERVER_URL' : null,
    ].filter(Boolean).join(', ');

    const errorMessage = `Parse initialization error: Missing environment variable(s): ${missingVars}. Please ensure these are set in your .env file (prefixed with NEXT_PUBLIC_) or in your deployment environment.`;
    console.error('[DEBUG] ' + errorMessage);
    throw new Error(errorMessage);
  }

  try {
    Parse.initialize(appId, jsKey);
    Parse.serverURL = serverURL;
    
    (window as any).parseReady = true;
    window.dispatchEvent(new CustomEvent('parseReady'));
    
    console.log('[DEBUG] Parse SDK initialized successfully');
    console.log('[DEBUG] Parse Server URL:', serverURL);
    console.log('[DEBUG] Parse App ID:', appId);
    
  } catch (error) {
    console.error('[DEBUG] Failed to initialize Parse SDK:', error);
    
    (window as any).parseReady = false;
    const errorMessage = error instanceof Error ? error.message : 'Parse initialization failed';
    window.dispatchEvent(new CustomEvent('parseError', {
      detail: { error: errorMessage }
    }));
    
    throw error;
  }
}