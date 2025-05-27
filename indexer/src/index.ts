import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import Gun from 'gun';
import Parse from 'parse/node'; // Using parse/node for server-side
import dotenv from 'dotenv';
import { writeDomainConfig, readDomainConfig, DomainConfig } from './adminUtils'; // Import admin functions

dotenv.config(); // Load environment variables from .env file

const portString: string = process.env.INDEXER_PORT || "3031";
const PORT: number = parseInt(portString, 10); // Explicitly type PORT

if (isNaN(PORT)) {
  console.error(`Invalid INDEXER_PORT: "${portString}". Must be a valid number.`);
  process.exit(1);
}

const PARSE_APP_ID = process.env.PARSE_APP_ID;
const PARSE_JAVASCRIPT_KEY = process.env.PARSE_JAVASCRIPT_KEY;
const PARSE_SERVER_URL = process.env.PARSE_SERVER_URL;
// const PARSE_MASTER_KEY = process.env.PARSE_MASTER_KEY; // Keep master key secure, use if needed for specific operations

if (!PARSE_APP_ID || !PARSE_JAVASCRIPT_KEY || !PARSE_SERVER_URL) {
  console.error('Missing required Parse environment variables (PARSE_APP_ID, PARSE_JAVASCRIPT_KEY, PARSE_SERVER_URL)');
  process.exit(1);
}

// Initialize Parse SDK
Parse.initialize(PARSE_APP_ID, PARSE_JAVASCRIPT_KEY);
// If using Master Key for specific operations: Parse.masterKey = PARSE_MASTER_KEY;
Parse.serverURL = PARSE_SERVER_URL;

const app = express();
const server = http.createServer(app);

// Initialize Gun
const gun = Gun({
  web: server, // Attach gun to the HTTP server
  // Example for S3 storage (install gun-s3 and aws-sdk if used)
  // s3: {
  //   key: process.env.AWS_ACCESS_KEY_ID,
  //   secret: process.env.AWS_SECRET_ACCESS_KEY,
  //   bucket: process.env.AWS_S3_BUCKET_NAME,
  //   region: process.env.AWS_S3_REGION
  // },
  // peers: ['http://some-super-peer.com/gun'] // Example peer list
});

// app.use(Gun.serve); // Gun is attached to the server, making /gun.js available.
app.use(express.json()); // Middleware to parse JSON bodies

app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Indexer Service is running!');
});

// TODO: Implement Event Validation & Persistence API endpoint (/report_event) - Step 5

// Admin API for configuration
// WARNING: This is a basic auth, replace with something more secure for production
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "supersecretkey";

// Middleware for admin API key authentication
const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return; // Important to return after sending response
  }
  next();
};

// Placeholder for SIWE message verification - this would be a more complex module
const verifySiweMessage = async (message: string, signature: string, expectedNonce?: string): Promise<{ address: string; chainId: number; nonce: string } | null> => {
  console.warn("SIWE verification is a placeholder. Implement actual verification logic.");
  // In a real implementation:
  // 1. Parse the SIWE message.
  // 2. Verify the signature against the message and extract the address.
  // 3. Check domain, nonce, issuedAt, expirationTime, etc.
  // 4. For now, simulate a successful verification for a known address if message contains it.
  if (message.includes("0x123") && signature) { // Super basic placeholder
    return { address: "0x123FakeAddress", chainId: 1, nonce: expectedNonce || "fakencenonce" };
  }
  return null;
};


app.post('/report_event', async (req: Request, res: Response): Promise<void> => {
  // Expected body: { domain: string, siweMessage: string, siweSignature: string, event: EVMEventPayload }
  interface EVMEventPayload {
    blockNumber: number;
    blockTimestamp: number; // Assuming seconds from epoch
    transactionHash: string;
    logIndex: number;
    contractAddress: string;
    eventName: string;
    eventData: Record<string, unknown>; // Parsed event parameters, 'unknown' is safer than 'any'
    // chainId might also be part of the payload or derived from domainConfig
  }
  const { domain, siweMessage, siweSignature, event } = req.body as { domain: string; siweMessage: string; siweSignature: string; event: EVMEventPayload };


  if (!domain || !siweMessage || !siweSignature || !event || typeof event !== 'object' || !event.transactionHash) {
    res.status(400).json({ error: 'Missing or invalid required fields: domain, siweMessage, siweSignature, or event structure' });
    return;
  }

  try {
    // 1. Authenticate client via SIWE (placeholder)
    // In a real scenario, you'd manage nonces server-side or via Gun.js user data
    const authResult = await verifySiweMessage(siweMessage, siweSignature);
    if (!authResult) {
      res.status(401).json({ error: 'SIWE authentication failed' });
      return;
    }
    const clientAddress = authResult.address;
    console.log(`Event reported by authenticated address: ${clientAddress} for domain: ${domain}`);

    // 2. Validate against domain configuration
    const domainConfig = await readDomainConfig(domain);
    if (!domainConfig) {
      res.status(404).json({ error: `Configuration for domain ${domain} not found.` });
      return;
    }

    // Check if clientAddress is in domainConfig.authorizedIndexers
    // Check if event.contractAddress matches domainConfig.contractAddress (or is in a list)
    // Check if event.eventName is one that should be indexed based on ABI
    // For now, basic checks:
    if (!domainConfig.authorizedIndexers.includes(clientAddress)) {
      console.warn(`Address ${clientAddress} not authorized to index for domain ${domain}. Authorized: ${domainConfig.authorizedIndexers.join(', ')}`);
      res.status(403).json({ error: `Address ${clientAddress} not authorized for domain ${domain}` });
      return;
    }
    if (event.contractAddress && domainConfig.contractAddress.toLowerCase() !== event.contractAddress.toLowerCase()) {
        res.status(400).json({ error: `Reported event contract ${event.contractAddress} does not match configured contract ${domainConfig.contractAddress} for domain ${domain}` });
        return;
    }
    // TODO: Add more detailed validation based on ABI (e.g., event name, parameters)

    // 3. Optional: Verify event against EVM chain (requires ethers/viem and RPC URL from domainConfig)
    // This is a complex step, involving fetching the transaction receipt and checking logs.
    console.log(`Placeholder for EVM event verification for tx: ${event.transactionHash}`);


    // 4. Write to Parse Server (Idempotent)
    const EVMEvent = Parse.Object.extend("EVMEvent");
    const query = new Parse.Query("EVMEvent");
    query.equalTo("chainId", domainConfig.chainId); // Assuming event has chainId or use domainConfig.chainId
    query.equalTo("transactionHash", event.transactionHash);
    query.equalTo("logIndex", event.logIndex);

    const existingEvent = await query.first({ useMasterKey: true }); // Use master key for system-level checks/writes

    if (existingEvent) {
      console.log(`Event ${event.transactionHash}-${event.logIndex} already exists in Parse. Skipping save.`);
    } else {
      const newEvent = new EVMEvent();
      // Map event fields to Parse object. Ensure all required fields from schema.js are present.
      newEvent.set("chainId", domainConfig.chainId); // Or event.chainId if provided by client
      newEvent.set("blockNumber", event.blockNumber);
      newEvent.set("blockTimestamp", new Date(event.blockTimestamp * 1000)); // Assuming timestamp is in seconds
      newEvent.set("transactionHash", event.transactionHash);
      newEvent.set("logIndex", event.logIndex);
      newEvent.set("contractAddress", event.contractAddress);
      newEvent.set("eventName", event.eventName);
      newEvent.set("eventData", event.eventData); // This should be the parsed event parameters
      
      // Assuming baseSchema fields (createdBy, updatedBy, organization, status) are handled by Parse triggers or set here
      // For now, let's assume they are not strictly required for this system-level event logging
      // Or, we might need a system user/org if baseSchema is enforced.
      // For simplicity, we'll omit them for now, but this needs review based on Parse Server setup.

      await newEvent.save(null, { useMasterKey: true });
      console.log(`Event ${event.transactionHash}-${event.logIndex} saved to Parse.`);
    }

    // 5. Publish to Gun.js
    const gunPath = `events/domain/${domain}/contract/${event.contractAddress}/event/${event.eventName}/tx/${event.transactionHash}/log/${event.logIndex}`;
    // Gun doesn't have native "idempotent put if not exists", but putting same data is usually fine.
    // Or, one could .once() check first, but that adds latency.
    // Ensure the object put into Gun is serializable and doesn't contain circular references or complex objects Gun can't handle.
    // The EVMEventPayload should generally be fine.
    gun.get(gunPath).put(event);
    console.log(`Event ${event.transactionHash}-${event.logIndex} published to Gun path: ${gunPath}`);

    res.status(200).json({ message: 'Event reported and processed successfully.' });

  } catch (error: unknown) {
    console.error('Error processing reported event:', error);
    const message = error instanceof Error ? error.message : 'Failed to process event';
    res.status(500).json({ error: message });
  }
});


app.post('/admin/config/:domain', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.params;
  // It's good practice to validate the body structure, e.g., using a validation library like Zod or Joi
  const configData = req.body as DomainConfig; // Assuming body matches DomainConfig for now

  if (!domain || typeof domain !== 'string' || !configData || typeof configData !== 'object') {
    res.status(400).json({ error: 'Missing or invalid domain or config data' });
    return;
  }

  try {
    await writeDomainConfig(domain, configData);
    res.status(200).json({ message: `Configuration for domain ${domain} successfully written.` });
  } catch (error: unknown) {
    console.error(`Error writing admin config for domain ${domain}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to write configuration';
    res.status(500).json({ error: message });
  }
});

app.get('/admin/config/:domain', authenticateAdmin, async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.params;
  if (!domain || typeof domain !== 'string') {
    res.status(400).json({ error: 'Missing or invalid domain' });
    return;
  }
  try {
    const config = await readDomainConfig(domain);
    if (config) {
      res.status(200).json(config);
    } else {
      res.status(404).json({ message: `Configuration for domain ${domain} not found.` });
    }
  } catch (error: unknown) {
    console.error(`Error reading admin config for domain ${domain}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to read configuration';
    res.status(500).json({ error: message });
  }
});


const main = async () => {
  try {
    // Test Parse connection by fetching server config
    await Parse.Config.get(); // This will throw if connection fails or no config is set
    console.log('Successfully connected to Parse Server (retrieved config).');
  } catch (error) {
    // It's possible no config is set up, but a specific error might indicate connection failure.
    // For a more robust check, one might try a specific query if a known class/object exists.
    // For now, we'll assume any error here could be a connection issue or lack of config.
    console.warn('Could not retrieve Parse Server config. This might be a connection issue or no config is set. Continuing startup...', error); // Added semicolon
    // If a stricter connection check is needed before proceeding, uncomment next line:
    // process.exit(1);
  }

};

main()
  .then(() => {
    server.listen(PORT, (): void => {
      console.log(`Indexer Service listening on http://localhost:${PORT}`);
      console.log(`Gun server started on http://localhost:${PORT}/gun`);
    });
  })
  .catch(error => {
    console.error("Unhandled error in Indexer main function or server startup:", error);
    process.exit(1);
  });

export { gun, Parse }; // Export gun and Parse instance for use in other modules