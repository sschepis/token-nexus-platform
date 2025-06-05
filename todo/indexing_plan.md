# EVM Smart Contract Indexing Platform - Remaining Tasks Checklist

This document outlines the remaining tasks for implementing the EVM Smart Contract Indexing Platform with Gun.js, based on the status check of `INDEXING_PLAN.md`.

## I. Core Indexer Service Implementation (`indexer/` directory)

- [ ] **2. Parse Server - Define `EVMEvent` Schema**:
    - [ ] Add the new `EVMEvent` class definition to the Parse Server schema. This schema should include fields such as `chainId` (Number), `blockNumber` (Number), `blockTimestamp` (Date), `transactionHash` (String), `logIndex` (Number), `contractAddress` (String), `eventName` (String), `eventData` (Object), and appropriate indexes (e.g., a unique compound index on `chainId`, `transactionHash`, `logIndex`).
- [ ] **3. Gun.js Peer Setup (in `indexer/src/server.ts` or similar main file)**:
    - [ ] Implement the core server logic to initialize an HTTP server, a Gun.js instance attached to it, and configure Gun.js (including optional storage adapter and peers if needed for production).
    - [ ] Initialize the Parse SDK within the Indexer Service, using credentials from environment variables.
- [ ] **4. Admin Configuration (in `indexer/src/adminUtils.ts` and `server.ts`)**:
    - [ ] Create an admin utility script/module (`indexer/src/adminUtils.ts`) to manage configuration securely via Gun.js SEA, including functions for generating/loading admin SEA keypairs and writing protected configuration (target chain, contracts, authorized indexers, `n` value).
    - [ ] Create a simple Admin API endpoint (`/admin/config`) in `server.ts`, protected by a secret key or basic auth, to allow configuration updates.
- [ ] **5. Event Validation & Persistence API (in `server.ts`)**:
    - [ ] Implement the `/report_event` API endpoint to receive event data from clients.
    - [ ] Implement **Authentication**: Verify the reporter client using SIWE (Sign-In with Ethereum) by comparing the authenticated wallet address against a list of authorized indexers from the protected config node in Gun.js.
    - [ ] Implement **Validation**: Check if the reported event matches configured contracts/ABIs. (Optional but recommended): Connect to the configured EVM RPC endpoint and verify the event log exists and matches reported data to prevent spoofing.
    - [ ] Implement **Idempotent Write to Parse**: Before saving, query Parse using unique identifiers (`chainId`, `transactionHash`, `logIndex`) to check if the event already exists. If not, create and save a new `Parse.Object('EVMEvent')`.
    - [ ] Implement **Publish to Gun**: If the write to Parse is successful (or the event already existed), publish the event data to the public Gun.js graph path.

## II. Client-Side Package Development (`packages/evm-indexer-client` or `client-sdk/`)

- [ ] **6. Client-Side Package Setup**:
    - [ ] Create a new directory for the client package (e.g., `packages/evm-indexer-client`).
    - [ ] Initialize a new Node.js/TypeScript project within this directory and install necessary dependencies (`gun`, `ethers`/`viem`, `axios`/`fetch` for reporting, SIWE libraries).
    - [ ] Set up build tooling to produce distributable formats (ESM, CJS, UMD).
- [ ] **7. Client-Side Package - Indexer Logic**:
    - [ ] Develop a class or set of functions within the client package to:
        - [ ] Initialize connection to the Gun.js peer hosted by the Indexer Service.
        - [ ] Authenticate with the `/report_event` endpoint using SIWE.
        - [ ] Read domain-specific configuration from the Indexer Service.
        - [ ] Use `ethers.js` or `viem` to listen for specified EVM smart contract events.
        - [ ] Prepare and send event payloads to the `/report_event` endpoint.
        - [ ] Implement state management (e.g., using `localStorage` or passing state) to persist the last processed block number for catch-up on missed events.
- [ ] **8. Client-Side Package - Reader Logic**:
    - [ ] Develop a class or set of functions within the client package to:
        - [ ] Connect to the Gun.js peer hosted by the Indexer Service.
        - [ ] Subscribe to relevant event paths in Gun.js for real-time updates.
        - [ ] Provide callbacks or an event emitter for consuming received event data.
        - [ ] (Optional) Implement helper functions to query the Parse Server API directly for historical event data.

## III. Optional Standalone Server-Side Indexer

- [ ] **9. Standalone Server-Side Indexer Implementation (in `indexer/src/standaloneIndexer.ts`)**:
    - [ ] Create a module that reads configuration from the Gun.js graph (using admin credentials).
    - [ ] Connect directly to the EVM RPC endpoint and listen for configured events.
    - [ ] Perform validation.
    - [ ] Write validated events idempotently to Parse Server using the Parse SDK.
    - [ ] Publish events to the Gun.js graph.
    - [ ] Integrate this module's start/stop logic into the main `indexer/src/server.ts`.

## IV. Development Workflow & Deployment Considerations

- [ ] **10. Development Workflow Update**:
    - [ ] Update the root `package.json` `scripts` section to include building/watching the new client package (if part of monorepo).
    - [ ] Ensure `.env` files are properly set up for all services involved (Parse Server, Indexer Service, Client).
- [ ] **11. Deployment Considerations**:
    - [ ] Plan for deploying both the Parse Server and the Indexer Service in production environments.
    - [ ] Configure storage adapters and peer lists appropriately for the production Gun.js environment.
    - [ ] Secure admin credentials and API endpoints in production.

## V. Handling Disconnections and Reconnections

- [ ] **Client-Side Catch-up Logic**: Implement persistence of the last processed block number for each designated indexer client and logic to query for and report missed events on startup/reconnection.
- [ ] **Server-Side Deduplication**: Ensure the `/report_event` endpoint on the Indexer Service remains idempotent by checking for existing events in Parse Server before saving.
- [ ] **Redundancy via 'n' Indexers**: Deploy multiple client indexers for inherent redundancy.
- [ ] **Standalone Server-Side Indexer (Fallback)**: Utilize the optional standalone indexer process as a safety net for continuous indexing.