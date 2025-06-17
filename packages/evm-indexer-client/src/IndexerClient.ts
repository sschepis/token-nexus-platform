import Gun from 'gun';
// Attempt to use types from @types/gun if they provide what's needed.
import type { IGunInstance } from 'gun';
// IGunConstructorOptions is not typically exported directly, use 'any' or a custom interface if needed.
import { ethers, Contract, InterfaceAbi, EventLog, Log } from 'ethers'; // Added EventLog, Log
import { SiweMessage } from 'siwe';
import axios from 'axios';

// Assuming DomainConfig and EVMEventPayload might be shared or defined here as well
// For now, let's define simplified versions or assume they'll be imported if this becomes a larger package.

interface ClientDomainConfig {
  rpcUrl: string;
  contractAddress: string;
  contractAbi: InterfaceAbi; // ethers v6 uses InterfaceAbi
  // Potentially other fields like authorizedIndexers, maxIndexersN if client needs them
}

export interface EVMEventPayload {
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
  logIndex: number;
  contractAddress: string;
  eventName: string;
  eventData: Record<string, unknown>;
}

export interface IndexerClientOptions {
  indexerServiceUrl: string; // e.g., http://localhost:3031
  domain: string;
  gunPeers?: string[]; // Optional: list of Gun peers to connect to
  gunOptions?: Record<string, unknown>; // Use 'unknown' for better type safety than 'any'
  signer?: ethers.Signer; // Required for SIWE
  localStorage?: Storage; // For persisting lastBlock, typically window.localStorage
}

export class IndexerClient {
  private options: IndexerClientOptions;
  private gun: IGunInstance; // Use IGunInstance from @types/gun
  private lastProcessedBlock: number = 0;
  private domainConfig: ClientDomainConfig | null = null;
  private evmContract: Contract | null = null;
  private reportingEnabled: boolean = false;

  constructor(options: IndexerClientOptions) {
    this.options = options;
    if (!options.signer) {
      console.warn("IndexerClient initialized without a signer. Event reporting will be disabled.");
    }
    this.gun = Gun(options.gunOptions || { peers: options.gunPeers || [`${options.indexerServiceUrl}/gun`] });
    this.loadLastProcessedBlock();
  }

  private loadLastProcessedBlock(): void {
    if (this.options.localStorage) {
      const storedBlock = this.options.localStorage.getItem(`indexerClient_${this.options.domain}_lastBlock`);
      if (storedBlock) {
        this.lastProcessedBlock = parseInt(storedBlock, 10);
        console.log(`[${this.options.domain}] Resuming from block: ${this.lastProcessedBlock}`);
      }
    }
  }

  private saveLastProcessedBlock(blockNumber: number): void {
    this.lastProcessedBlock = blockNumber;
    if (this.options.localStorage) {
      this.options.localStorage.setItem(`indexerClient_${this.options.domain}_lastBlock`, blockNumber.toString());
    }
  }

  // Placeholder for fetching nonce for SIWE
  private async getNonce(): Promise<string> {
    console.warn("getNonce is a placeholder. Implement fetching nonce from server or user state.");
    // In a real app, this might come from an API endpoint on your IndexerService or be managed via Gun user data.
    return `nonce-${Date.now()}`;
  }

  public async authenticateAndSetup(): Promise<void> {
    if (!this.options.signer) {
      console.error("Cannot authenticate: Signer not provided.");
      return;
    }
    console.log(`[${this.options.domain}] Authenticating and setting up...`);
    // 1. SIWE Authentication (Simplified Placeholder)
    try {
      const address = await this.options.signer.getAddress();
      const chainId = (await this.options.signer.provider?.getNetwork())?.chainId || 1; // Default to 1 if provider not available
      
      const siweMessage = new SiweMessage({
        domain: window.location.host, // Or a specific domain if not in browser
        address,
        statement: `Sign in to ${this.options.domain} indexer client.`,
        uri: window.location.origin, // Or a specific URI
        version: '1',
        chainId: Number(chainId), // Ensure it's a number
        nonce: await this.getNonce(),
        issuedAt: new Date().toISOString(),
      });
      const messageToSign = siweMessage.prepareMessage();
      const signature = await this.options.signer.signMessage(messageToSign);
      console.log(`[${this.options.domain}] SIWE Signature obtained (placeholder validation). Message: ${messageToSign}`);
      // In a real scenario, you'd send this to an auth endpoint on IndexerService.
      // For now, we assume this step would grant rights if IndexerService validated it.
      // The actual authorization check happens when reporting events.

    } catch (error) {
      console.error(`[${this.options.domain}] SIWE Authentication failed:`, error);
      this.reportingEnabled = false;
      return;
    }

    // 2. Read Domain Configuration (Placeholder - should fetch from IndexerService admin API or Gun)
    console.warn(`[${this.options.domain}] Domain config reading is a placeholder. Implement fetching from server.`);
    // This should ideally fetch from a secure endpoint on your IndexerService,
    // or read from a known, possibly admin-protected, Gun.js path.
    // Example:
    // const response = await axios.get(`${this.options.indexerServiceUrl}/admin/config/${this.options.domain}`, { headers: { 'x-some-auth': '...' }});
    // this.domainConfig = response.data;
    // For now, using a mock config:
    this.domainConfig = {
      rpcUrl: "http://localhost:8545", // Replace with actual or fetched RPC
      contractAddress: "0xYourContractAddress", // Replace
      contractAbi: [/* Your ABI here */]
    };
    console.log(`[${this.options.domain}] Loaded (mock) domain config:`, this.domainConfig);

    if (this.domainConfig) {
      this.reportingEnabled = true; // Enable reporting only if signer and config are present
      this.setupEVMListener();
    } else {
      this.reportingEnabled = false;
      console.error(`[${this.options.domain}] Failed to load domain configuration. Event listening disabled.`);
    }
  }

  private setupEVMListener(): void {
    if (!this.domainConfig || !this.reportingEnabled || !this.options.signer?.provider) {
      console.log(`[${this.options.domain}] EVM Listener setup skipped (missing config, reporting disabled, or no provider).`);
      return;
    }
    console.log(`[${this.options.domain}] Setting up EVM listener for contract: ${this.domainConfig.contractAddress}`);
    
    const provider = new ethers.JsonRpcProvider(this.domainConfig.rpcUrl); // Or use this.options.signer.provider
    this.evmContract = new Contract(this.domainConfig.contractAddress, this.domainConfig.contractAbi, provider);

    // TODO: Implement catch-up logic for missed events from this.lastProcessedBlock to current block.

    // Listen to all events defined in the ABI
    // For ethers v6, the generic "*" event listener provides an ethers.EventLog object
    this.evmContract.on("*", async (log: unknown) => {
      // Type guard to ensure it's an EventLog
      if (!(log instanceof EventLog) || !log.args || !log.eventName) {
        console.debug(`[${this.options.domain}] Received non-EventLog or incomplete log:`, log);
        return;
      }
      const eventLog = log as EventLog & { log: Log }; // Assert 'log' property for blockNumber etc.

      // Convert ethers.Result (args) to a plain object
      const eventArgs: Record<string, unknown> = {};
      if (eventLog.args) {
        for (const key in eventLog.args) {
          if (isNaN(parseInt(key))) { // Filter out numeric array indices
            eventArgs[key] = eventLog.args[key];
          }
        }
      }

      const block = await provider.getBlock(eventLog.blockNumber);

      const eventPayload: EVMEventPayload = {
        blockNumber: eventLog.blockNumber,
        blockTimestamp: block?.timestamp || Math.floor(Date.now()/1000),
        transactionHash: eventLog.transactionHash,
        logIndex: eventLog.index,
        contractAddress: eventLog.address,
        eventName: eventLog.eventName,
        eventData: eventArgs,
      };
      
      console.log(`[${this.options.domain}] Event received: ${eventPayload.eventName}`, eventPayload);
      await this.reportEvent(eventPayload);
      this.saveLastProcessedBlock(eventPayload.blockNumber);
    });

    console.log(`[${this.options.domain}] Listening for events on ${this.domainConfig.contractAddress}`);
  }

  public async reportEvent(event: EVMEventPayload): Promise<void> {
    if (!this.reportingEnabled) {
      console.warn(`[${this.options.domain}] Event reporting is disabled. Skipping report for:`, event.eventName);
      return;
    }
    if (!this.options.signer) {
        console.error("Cannot report event: Signer not available for SIWE.");
        return;
    }

    console.log(`[${this.options.domain}] Reporting event: ${event.eventName}`);
    try {
      // Prepare SIWE message for this specific action or use a session
      const address = await this.options.signer.getAddress();
      const chainId = (await this.options.signer.provider?.getNetwork())?.chainId || 1;
      
      const siweMessage = new SiweMessage({
        domain: window.location.host, // Or specific domain
        address,
        statement: `Report event ${event.eventName} for domain ${this.options.domain}.`,
        uri: window.location.origin, // Or specific URI
        version: '1',
        chainId: Number(chainId),
        nonce: await this.getNonce(), // Nonce should be fresh for each report or managed carefully
        issuedAt: new Date().toISOString(),
        resources: [`evmEvent:${event.transactionHash}:${event.logIndex}`] // Example resource
      });
      const messageToSign = siweMessage.prepareMessage();
      const signature = await this.options.signer.signMessage(messageToSign);

      const payload = {
        domain: this.options.domain,
        siweMessage: messageToSign,
        siweSignature: signature,
        event: event,
      };
      await axios.post(`${this.options.indexerServiceUrl}/report_event`, payload);
      console.log(`[${this.options.domain}] Event ${event.eventName} reported successfully.`);
    } catch (error) {
      console.error(`[${this.options.domain}] Failed to report event ${event.eventName}:`, error);
      // TODO: Implement retry logic or dead-letter queue for failed reports
    }
  }

  public stopListening(): void {
    if (this.evmContract) {
      this.evmContract.removeAllListeners();
      console.log(`[${this.options.domain}] Stopped listening for EVM events.`);
    }
    this.reportingEnabled = false;
  }
}