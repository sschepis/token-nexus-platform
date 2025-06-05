# EVM Smart Contract Management - Remaining Tasks Checklist

This document outlines the remaining tasks for implementing the EVM Smart Contract Management UI, based on the status check of `EVM_CONTRACT_MANAGEMENT_PLAN.md`.

## I. Data Management & Storage (Critical Missing Components)

- [ ] **1. Network Configuration Storage**:
    - [ ] Create and populate the `src/config/evmNetworks.json` file to store network configurations (id, name, chainId, rpcUrl, blockExplorerUrl for each network).
- [ ] **2. Deployment Artifact Storage**:
    - [ ] Reconcile or create the `src/config/evm-deployments/` directory. This directory must contain Hardhat deployment JSON files organized by network subdirectory (e.g., `src/config/evm-deployments/sepolia/DiamondFactory.json`).
- [ ] **3. Data Parsing Utility**:
    - [ ] Create or enhance a utility function to:
        - [ ] List available networks from `src/config/evmNetworks.json`.
        - [ ] For a selected network, read and parse contract deployment JSON files from `src/config/evm-deployments/<network_id>/` to extract `contractName`, `address`, and ABI.

## II. UI Components & Structure (Dependent on Data Presence)

- [ ] **EVM Contracts Tab Component (`EVMContractsManager.tsx`)**:
    - [ ] Implement the `EVMContractsManager.tsx` component's internal logic to:
        - [ ] Load network configurations from the newly created `src/config/evmNetworks.json`.
        - [ ] Manage `selectedNetworkId`, `networks`, `deployedContracts`, and `isLoading` states.
        - [ ] Dynamically populate the "Network Selector" dropdown using the loaded network data.
        - [ ] Implement the logic to read and parse deployment JSONs from `src/config/evm-deployments/` based on the `selectedNetworkId`.
        - [ ] Populate the "Deployed Contracts Display" table with the parsed contract data.
        - [ ] Ensure proper loading states (spinners, skeleton loaders) are displayed.
        - [ ] Handle cases where no deployment files are found or contracts are not configured.

## III. Workflow & Logic (Dependent on Data Presence)

- [ ] **Initialization Logic**:
    - [ ] Ensure that `EVMContractsManager.tsx` correctly initializes by loading network configurations and setting a default selected network.
- [ ] **Network Selection Change Logic**:
    - [ ] Implement the logic to trigger the reading and parsing of deployment JSONs when the user selects a different network.
- [ ] **Displaying Contracts Logic**:
    - [ ] Ensure the table correctly iterates and renders contract details, including dynamically generated block explorer links and copy-to-clipboard functionality.

## IV. Future Enhancements (Phase 2+)

- [ ] **Dynamic Network Configuration UI**:
    - [ ] Develop UI elements and backend logic to allow adding, editing, and deleting network configurations directly from the admin panel, rather than manual JSON editing.
- [ ] **ABI Interaction**:
    - [ ] Implement functionality to display key functions from the contract ABI.
    - [ ] Allow read-only calls for contract methods from the UI.
    - [ ] (Future) Implement write transaction capabilities with appropriate wallet integration.
- [ ] **Facet Management for Diamonds**:
    - [ ] If a deployed contract is identified as a Diamond proxy, implement UI to display its registered facets.
- [ ] **Deployment Script Integration**:
    - [ ] Explore and implement ways to trigger Hardhat deployment scripts directly from the UI.
- [ ] **Automatic Import**:
    - [ ] Implement a system to watch specific project directories (e.g., `../gem-base`) for new deployments and offer to import them automatically.