import Gun from 'gun';
// IGunInstance is the main Gun constructor type.
// IGunChainReference represents the result of .get(), .map(), etc.
import type { IGunInstance, IGunChain } from 'gun';

// Assuming EVMEventPayload might be shared or defined here/imported
interface EVMEventPayload {
  blockNumber: number;
  blockTimestamp: number;
  transactionHash: string;
  logIndex: number;
  contractAddress: string;
  eventName: string;
  eventData: Record<string, unknown>;
}

export interface ReaderClientOptions {
  indexerServiceUrl: string; // e.g., http://localhost:3031
  domain: string;
  gunPeers?: string[];
  gunOptions?: Record<string, unknown>;
}

type EventCallback = (event: EVMEventPayload) => void;

export class ReaderClient {
  private options: ReaderClientOptions;
  private gun: IGunInstance;
  // Using 'any' for Gun chain references due to complexities with @types/gun and chained methods like .map().on()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private subscriptions: Map<string, any> = new Map();

  constructor(options: ReaderClientOptions) {
    this.options = options;
    this.gun = Gun(options.gunOptions || { peers: options.gunPeers || [`${options.indexerServiceUrl}/gun`] });
  }

  /**
   * Subscribes to all events for a specific contract or a specific event type on that contract.
   * @param contractAddress The address of the smart contract.
   * @param eventName Optional. The specific event name to subscribe to. If null/undefined, subscribes to all events for the contract.
   * @param callback The function to call when an event is received.
   */
  public subscribeToEvents(
    contractAddress: string,
    eventName: string | null | undefined,
    callback: EventCallback
  ): string {
    let basePath = `events/domain/${this.options.domain}/contract/${contractAddress.toLowerCase()}`;
    if (eventName) {
      basePath += `/event/${eventName}`;
    }

    // Generate a unique subscription ID for potential unsubscribing
    const subscriptionId = `${basePath}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    console.log(`[${this.options.domain}] Subscribing to Gun path starting with: ${basePath}`);

    // Gun's .map().on() is suitable for lists of items.
    // Events are structured like: /tx/[txHash]/log/[logIndex] under the eventName path.
    // We need to listen deeply. A common pattern is to traverse known parts and then .map() on the final collection.
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gunRef: any; // Using 'any' due to Gun.js typing complexities with chained methods

    if (eventName) {
      // Path: events/domain/{domain}/contract/{addr}/event/{eventName}/tx
      gunRef = this.gun.get(basePath).get('tx');
    } else {
      // Path: events/domain/{domain}/contract/{addr}/event
      console.warn(`[${this.options.domain}] Subscribing to all events for a contract directly is not straightforward with the current Gun structure. Please specify an eventName.`);
      // Attempting to listen to the contract's "event" node. This might not yield individual event payloads directly.
      gunRef = this.gun.get(basePath);
    }
    
    // Assuming the structure under 'tx' is a map of transaction hashes
    const subscriptionNode = gunRef.map().on((txDataNode: Record<string, unknown> | undefined, txHash: string) => {
      if (txDataNode && typeof txHash === 'string') {
        const logMapPathNode = this.gun.get(basePath).get('tx').get(txHash).get('log');
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (logMapPathNode as any).map().on((logPayload: EVMEventPayload | undefined, logIndexKey: string) => {
          if (logPayload && typeof logPayload === 'object' && logPayload !== null && !('_' in logPayload)) {
            const event = logPayload as EVMEventPayload;
            if (event.eventName && event.transactionHash) {
                 console.log(`[${this.options.domain}] Event received via Gun (tx: ${txHash}, log: ${logIndexKey}):`, event);
                 callback(event);
            }
          }
        });
      }
    });

  this.subscriptions.set(subscriptionId, subscriptionNode);
  return subscriptionId;
}

  /**
   * Unsubscribes from events.
   * @param subscriptionId The ID returned by subscribeToEvents.
   */
  public unsubscribe(subscriptionId: string): void {
    const subscriptionNode = this.subscriptions.get(subscriptionId);
    if (subscriptionNode) {
      subscriptionNode.off(); // Assuming .off() is available on the stored 'any' type
      this.subscriptions.delete(subscriptionId);
      console.log(`[${this.options.domain}] Unsubscribed: ${subscriptionId}`);
    }
  }

  /**
   * Disconnects from Gun.
   */
  public disconnect(): void {
    // Gun doesn't have a formal "disconnect" for a client from all peers in the same way some other libraries do.
    // .off() removes listeners. To truly stop communication, you might need to re-initialize Gun or manage peers.
    // For now, clearing subscriptions is the main action.
    this.subscriptions.forEach(node => node.off()); // Assuming .off() is available
    this.subscriptions.clear();
    console.log(`[${this.options.domain}] All subscriptions cleared. Gun instance remains but listeners are off.`);
    // If you need to remove peers:
    // if (this.gun.back) { // Check if 'back' (internal for peers) exists
    //   const peers = this.gun.back('opt.peers');
    //   if (peers) {
    //     Object.keys(peers).forEach(peerUrl => {
    //       this.gun.back('bye', peers[peerUrl]); // This is an internal/undocumented way, might not be stable
    //     });
    //   }
    // }
  }
}