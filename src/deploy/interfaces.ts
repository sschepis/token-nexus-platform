/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';

// Define basic interfaces for Parse Objects (assuming common methods)
export interface ParseObject {
  id: string;
  get(key: string): any;
  set(key: string, value: any): void;
  save(): Promise<this>;
  destroy(): Promise<this>;
  relation(key: string): { add(objects: ParseObject[]): void; remove(objects: ParseObject[]): void };
}

export interface ParseQuery<T extends ParseObject> {
  equalTo(key: string, value: any): ParseQuery<T>;
  first(): Promise<T | undefined>;
  find(): Promise<T[]>;
}

// Define interfaces for specific Parse classes used
export interface OrganizationParseObject extends ParseObject {
  get(key: 'name'): string;
}

export interface ProjectParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'description'): string;
  get(key: 'organization'): OrganizationParseObject;
}

export interface DeploymentParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'description'): string;
  get(key: 'project'): ProjectParseObject;
}

export interface BlockchainParseObject extends ParseObject {
  get(key: 'networkId'): number;
  get(key: 'rpcEndpoint'): string;
}

export interface AbiParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'data'): any; // ABI structure can be complex, using any for simplicity here // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface SmartContractParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'abi'): AbiParseObject;
  get(key: 'name'): string;
  get(key: 'code'): string;
}

export interface DiamondParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'symbol'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'diamondFactory'): DiamondFactoryParseObject;
}

export interface DiamondFacetParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'abi'): AbiParseObject;
  get(key: 'smartContract'): SmartContractParseObject;
  get(key: 'name'): string;
  get(key: 'code'): string;
}

export interface DiamondFactoryParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'networkId'): number;
  get(key: 'abi'): AbiParseObject;
  get(key: 'smartContract'): SmartContractParseObject;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'deployment'): DeploymentParseObject;
}

export interface EventDefinitionParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'code'): string;
  get(key: 'contractName'): string;
  get(key: 'abi'): AbiParseObject;
  get(key: 'data'): any; // Event data structure can be complex // eslint-disable-line @typescript-eslint/no-explicit-any
  get(key: 'inputs'): any[]; // Event inputs structure can be complex // eslint-disable-line @typescript-eslint/no-explicit-any
  get(key: 'type'): string;
  get(key: 'diamond'): DiamondParseObject;
  get(key: 'network'): BlockchainParseObject;
}

export interface EventListenerParseObject extends ParseObject {
  get(key: 'name'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'networkId'): number;
  get(key: 'definition'): EventDefinitionParseObject;
  get(key: 'address'): string;
  get(key: 'enabled'): boolean;
  get(key: 'project'): ProjectParseObject;
  get(key: 'diamond'): DiamondParseObject;
  set(key: 'enabled', value: boolean): void;
}

export interface DeploymentArtifactParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'abi'): any;
  get(key: 'args'): any;
  get(key: 'receipt'): any;
  get(key: 'address'): string;
  get(key: 'transactionHash'): string;
  get(key: 'solcInputHash'): string;
  get(key: 'deployedBytecode'): string;
  get(key: 'libraries'): any;
  get(key: 'storageLayout'): any;
  get(key: 'metadata'): string;
  get(key: 'name'): string;
  get(key: 'contractName'): string;
  get(key: 'devdoc'): any;
  get(key: 'userdoc'): any;
  get(key: 'sourceCode'): any;
  get(key: 'rpcUrl'): string;
  get(key: 'artifact'): DeploymentArtifactJson;
}

export interface SourceCodeParseObject extends ParseObject {
  get(key: 'address'): string;
  get(key: 'name'): string;
  get(key: 'network'): BlockchainParseObject;
  get(key: 'file'): string;
  get(key: 'content'): string;
  get(key: 'keccak256'): string;
  get(key: 'license'): string;
}

export interface BytecodeParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'abi'): AbiParseObject;
  get(key: 'bytecode'): string;
  get(key: 'contractName'): string;
  get(key: 'name'): string;
  get(key: 'address'): string;
}

export interface DevdocParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'artifact'): DeploymentArtifactParseObject;
  get(key: 'data'): any;
}

export interface UserdocParseObject extends ParseObject {
  get(key: 'blockchain'): BlockchainParseObject;
  get(key: 'deployment'): DeploymentParseObject;
  get(key: 'artifact'): DeploymentArtifactParseObject;
  get(key: 'data'): any;
}


// Define interface for the structure of Hardhat deployment JSON artifacts
export interface DeploymentArtifactJson {
  name: any;
  contractName: string;
  address: string;
  abi: any; // ABI structure can be complex
  args?: any[];
  receipt?: any;
  transactionHash?: string;
  solcInputHash?: string;
  deployedBytecode?: string;
  libraries?: any;
  storageLayout?: any;
  metadata?: string;
  devdoc?: any;
  userdoc?: any;
  rpcUrl?: string; // Added rpcUrl property
  sourceCode?: { file: string; content: string; keccak256?: string; license?: string; };
}

// Define interface for the structure returned by readAbisFromDeploymentsFolder
export interface NetworkDeploymentData {
  name: string;
  abi: any;
  address: string;
  networkName: string;
  networkId: number;
  artifact: DeploymentArtifactJson;
}