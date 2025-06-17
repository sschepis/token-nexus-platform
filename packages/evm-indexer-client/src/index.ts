// EVM Indexer Client Package

export const helloWorld = (): string => {
  return "Hello from evm-indexer-client!";
};

// Export the main client classes
export { IndexerClient } from './IndexerClient';
export type { IndexerClientOptions } from './IndexerClient';

export { ReaderClient } from './ReaderClient';
export type { ReaderClientOptions } from './ReaderClient';

// Re-export common types that consumers might need
export type { EVMEventPayload } from './IndexerClient';