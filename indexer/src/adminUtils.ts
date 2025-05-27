/* eslint-disable @typescript-eslint/no-explicit-any */
import { gun } from './index'; // Assuming gun instance is exported from index.ts
import Gun from 'gun'; // For Gun.SEA namespace

// This would typically come from a secure environment variable or a managed secret
const ADMIN_SEA_KEYPAIR_JSON = process.env.ADMIN_SEA_KEYPAIR_JSON;

interface SeaKeyPair {
  pub: string;
  priv: string;
  epub: string;
  epriv: string;
}

let adminPair: SeaKeyPair | null = null;

const getAdminKeypair = async (): Promise<SeaKeyPair> => {
  if (adminPair) {
    return adminPair;
  }
  if (ADMIN_SEA_KEYPAIR_JSON) {
    try {
      const parsedPair = JSON.parse(ADMIN_SEA_KEYPAIR_JSON) as SeaKeyPair;
      // Basic validation for keypair structure
      if (parsedPair && parsedPair.pub && parsedPair.priv && parsedPair.epub && parsedPair.epriv) {
        adminPair = parsedPair;
        console.log('Loaded admin keypair from environment variable.');
        return adminPair; // Successfully loaded and validated
      } else {
        // Parsed object doesn't look like a valid keypair
        console.error('Parsed ADMIN_SEA_KEYPAIR_JSON is not a valid keypair structure. Generating new temporary admin keypair.');
        // Fall through to generate a new pair outside this catch block
      }
    } catch (e) {
      console.error('Failed to parse ADMIN_SEA_KEYPAIR_JSON. Generating new temporary admin keypair.', e);
      // Fall through to generate a new pair outside this catch block
    }
    // If parsing failed or structure was invalid, generate a new pair:
    const newPairOnParseError = await Gun.SEA.pair();
    if (!newPairOnParseError || !newPairOnParseError.pub || !newPairOnParseError.priv) { // Check if pair is valid
        throw new Error("Gun.SEA.pair() did not return a valid keypair after JSON parsing failure/invalid structure.");
    }
    adminPair = newPairOnParseError as SeaKeyPair;
    console.warn('Generated new temporary admin keypair (due to parsing issue). Store this securely:', JSON.stringify(adminPair));
    return adminPair;

  } else {
    // ADMIN_SEA_KEYPAIR_JSON was not set at all
    console.warn('ADMIN_SEA_KEYPAIR_JSON not set. Generating new temporary admin keypair.');
    // Gun.SEA.pair() returns a promise that resolves to the keypair.
    // The exact type might be generic, so casting to SeaKeyPair is okay if structure matches.
    const newPair = await Gun.SEA.pair();
    if (!newPair || !newPair.pub || !newPair.priv) { // Basic check for a valid pair
        throw new Error("Gun.SEA.pair() did not return a valid keypair.");
    }
    adminPair = newPair as SeaKeyPair;
    console.warn('Generated new temporary admin keypair. Store this securely for consistent admin access:', JSON.stringify(adminPair));
    return adminPair;
  }
};

interface AbiInputOutput {
  internalType?: string;
  name: string;
  type: string;
  components?: AbiInputOutput[]; // For struct types
}

interface AbiItem {
  anonymous?: boolean;
  inputs?: AbiInputOutput[];
  name?: string; // Event name or function name
  outputs?: AbiInputOutput[];
  stateMutability?: string; // e.g., 'view', 'nonpayable', 'payable'
  type: string; // e.g., 'function', 'event', 'constructor', 'fallback'
}

export interface DomainConfig { // Added export
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  contractAbi: AbiItem[];
  authorizedIndexers: string[]; // e.g., wallet addresses or public keys
  maxIndexersN: number;
}

const CONFIG_BASE_PATH = 'config/domain/';

/**
 * Writes or updates the configuration for a specific domain.
 * @param domain The domain name (e.g., "mydomain.com")
 * @param configData The configuration data for the domain
 */
export const writeDomainConfig = async (domain: string, configData: DomainConfig): Promise<void> => {
  const pair = await getAdminKeypair();
  if (!pair) {
    throw new Error('Admin keypair not available.');
  }
  const path = `${CONFIG_BASE_PATH}${domain}`;
  console.log(`Attempting to write config for domain "${domain}" to path: ${path}`);

  // Gun's .put() under a user graph automatically signs it.
  // Gun's .put() under a user graph automatically signs it.
  // The user graph reference itself needs to be typed if possible, e.g., IGunUserInstance
  const userGraph = gun.user(pair as any); // Using 'as any' for pair if Gun.user expects specific SEA pair type not easily available

  // Define a more flexible Ack type based on common Gun patterns
  interface GunPutAck {
    ok?: any; // Make 'ok' very permissive to handle Gun's various ack structures
    err?: string | Error;
    '@'?: string; // Soul of the ack
  }

  return new Promise<void>((resolve, reject) => {
    userGraph.get(path).put(configData as any, (ack: GunPutAck) => { // Cast configData if Gun complains
      if (ack.err) {
        const errorMessage = typeof ack.err === 'string' ? ack.err : (ack.err instanceof Error ? ack.err.message : 'Unknown error writing domain config');
        console.error(`Error writing domain config for ${domain}:`, errorMessage);
        reject(new Error(errorMessage));
      } else {
        // Check for 'ok' presence as a success indicator, even if its value is complex
        if (ack.ok !== undefined) {
          console.log(`Successfully wrote domain config for ${domain} to ${path}. Ack:`, ack);
          resolve();
        } else {
          // If no 'err' but also no 'ok', it's an ambiguous situation, treat as error for safety
          console.error(`Ambiguous ack when writing domain config for ${domain} (no err, no ok):`, ack);
          reject(new Error('Ambiguous acknowledgement from Gun.put'));
        }
      }
    });
  });
};

/**
 * Reads the configuration for a specific domain.
 * @param domain The domain name (e.g., "mydomain.com")
 * @returns The domain configuration object or null if not found.
 */
export const readDomainConfig = async (domain: string): Promise<DomainConfig | null> => {
  const pair = await getAdminKeypair();
  const path = `${CONFIG_BASE_PATH}${domain}`;
  const userGraph = gun.user(pair as any); // Using 'as any' for pair if Gun.user expects specific SEA pair type

  return new Promise<DomainConfig | null>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout reading config for domain ${domain}`));
    }, 5000); // 5 second timeout

    userGraph.get(path).once((data: DomainConfig | undefined, key: string) => {
      clearTimeout(timeoutId);
      if (data === undefined) {
        console.log(`No config found for domain "${domain}" at path: ${path}`);
        resolve(null);
      } else {
        // Gun often returns metadata with the object.
        // A common way to strip Gun's metadata ('_') if it exists and data is an object
        const cleanData = { ...data };
        if (typeof cleanData === 'object' && cleanData !== null && '_' in cleanData) {
          delete (cleanData as any)._;
        }
        console.log(`Successfully read domain config for ${domain}:`, cleanData);
        resolve(cleanData as DomainConfig); // Cast if cleanData is still potentially 'object'
      }
    });
  });
};

// Initialize admin keypair on module load to generate/log if needed
getAdminKeypair().catch(err => console.error("Failed to initialize admin keypair on load:", err));