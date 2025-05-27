/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { getOrCreateRecord, getRecords } from '@/parse/parseService';
import {
  BlockchainParseObject, DeploymentArtifactParseObject, DiamondParseObject,
  DiamondFacetParseObject, DiamondFactoryParseObject, EventListenerParseObject,
  AbiParseObject, SourceCodeParseObject, BytecodeParseObject, DevdocParseObject,
  UserdocParseObject, NetworkDeploymentData, ProjectParseObject,
  DeploymentParseObject, EventDefinitionParseObject, SmartContractParseObject
} from './interfaces';
import { parseAbi } from './artifactProcessing';
// NOTE: recordManagement functions like getOrganizationById, createProjectFor etc.
// are used by networkImportManager, not directly here.

export async function importDeploymentArtifactAbi(
  blockchain: BlockchainParseObject,
  deploymentArtifact: DeploymentArtifactParseObject
): Promise<AbiParseObject | undefined> {
  const abiName = deploymentArtifact.get('name');
  const abi = deploymentArtifact.get('abi');

  const abiObject = await getOrCreateRecord(
    'Abi',
    ['name', 'network'],
    [abiName, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
    {
      name: abiName,
      data: abi,
      network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
    }
  ) as AbiParseObject | undefined;

  if (abiObject) {
    await parseAbi(abiObject, abi);
  }
  return abiObject;
}

export async function importDeploymentArtifactSourceCode(
  blockchain: BlockchainParseObject,
  deploymentArtifact: DeploymentArtifactParseObject
): Promise<SourceCodeParseObject | undefined> {
  // Assuming 'artifact' property on DeploymentArtifactParseObject holds the JSON data
  const artifactData = deploymentArtifact.get('artifact') as NetworkDeploymentData['artifact'];
  if (!artifactData || !artifactData.sourceCode) return undefined;

  const source = await getOrCreateRecord(
    'SourceCode',
    ['address', 'network'],
    [artifactData.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
    {
      address: artifactData.address,
      name: artifactData.contractName,
      network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      file: artifactData.sourceCode.file,
      content: artifactData.sourceCode.content,
      keccak256: artifactData.sourceCode.keccak256,
      license: artifactData.sourceCode.license,
    }
  ) as SourceCodeParseObject | undefined;
  if (source) await source.save();
  return source;
}

export async function importDeploymentArtifactEventListener(
  blockchain: BlockchainParseObject,
  project: ProjectParseObject,
  eventDef: EventDefinitionParseObject,
  contractAddress: string
): Promise<EventListenerParseObject | undefined> {
  const edName = eventDef.get('name');
  const newRec = await getOrCreateRecord(
    'EventListener',
    ['name', 'networkId', 'project'],
    [edName, blockchain.get('networkId'), { "__type": "Pointer", "className": "Project", "objectId": project.id }],
    {
      name: edName,
      network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      networkId: blockchain.get('networkId'),
      definition: { __type: "Pointer", className: "EventDefinition", objectId: eventDef.id },
      address: contractAddress,
      enabled: true,
      project: { __type: "Pointer", className: "Project", objectId: project.id },
    }
  ) as EventListenerParseObject | undefined;
  if (newRec) await newRec.save();
  return newRec;
}

export async function importDeploymentArtifactSmartContract(
  blockchain: BlockchainParseObject,
  deploymentArtifact: DeploymentArtifactParseObject,
  abiObject: AbiParseObject
): Promise<SmartContractParseObject | undefined> {
  const artifactData = deploymentArtifact.get('artifact') as NetworkDeploymentData['artifact'];
  const smartContract = await getOrCreateRecord(
    'SmartContract',
    ['address', 'network'],
    [artifactData.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
    {
      name: artifactData.contractName,
      address: artifactData.address,
      network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
      contractType: 'Standard',
      deploymentTransaction: artifactData.transactionHash,
      code: artifactData.contractName.toUpperCase(),
    }
  ) as SmartContractParseObject | undefined;
  if (smartContract) await smartContract.save();
  return smartContract;
}

export async function importDeploymentArtifactDiamondFacet(
  blockchain: BlockchainParseObject,
  deploymentArtifact: DeploymentArtifactParseObject, // This might represent the Diamond, not the Facet artifact directly
  abiObject: AbiParseObject,
  facetAddress: string, // The actual address of the facet
  smartContract: SmartContractParseObject // The SmartContract record for the facet
): Promise<DiamondFacetParseObject | undefined> {
  const artifactData = deploymentArtifact.get('artifact') as NetworkDeploymentData['artifact']; // Assuming this is the facet's artifact if available, or use a generic name
  const facetName = smartContract.get('name'); // Use the name from the created SmartContract for the facet

  const diamondFacet = await getOrCreateRecord(
    'DiamondFacet',
    ['address', 'network'],
    [facetAddress, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
    {
      name: facetName, // Use the specific facet's name
      address: facetAddress,
      network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
      smartContract: { __type: "Pointer", className: "SmartContract", objectId: smartContract.id },
      code: facetName.toUpperCase(), // Use the specific facet's code
    }
  ) as DiamondFacetParseObject | undefined;
  if (diamondFacet) await diamondFacet.save();
  return diamondFacet;
}

export async function importDeploymentArtifactDiamondFactory(
  blockchain: BlockchainParseObject,
  deploymentArtifact: DeploymentArtifactParseObject, // This is the DiamondFactory artifact
  abiObject: AbiParseObject,
  deployment: DeploymentParseObject,
  smartContract: SmartContractParseObject, // This is the SmartContract for the DiamondFactory
  rpcUrl: string
): Promise<DiamondFactoryParseObject | undefined> {
  const artifactData = deploymentArtifact.get('artifact') as NetworkDeploymentData['artifact'];
  const nid = blockchain.get('networkId');

  const diamondFactory = await getOrCreateRecord(
    'DiamondFactory',
    ['address', 'network'],
    [artifactData.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
    {
      networkId: nid,
      abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
      smartContract: { __type: "Pointer", className: "SmartContract", objectId: smartContract.id },
      address: artifactData.address,
      network: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      name: artifactData.contractName,
      code: artifactData.contractName.toUpperCase(),
      deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
    }
  ) as DiamondFactoryParseObject | undefined;

  if (!diamondFactory) {
    console.error(`Failed to create or update DiamondFactory at ${artifactData.address}`);
    return undefined;
  }
  await diamondFactory.save();

  const dfaddress = artifactData.address;
  let _symbols: string[] = [];
  try {
    const symbolsResult: any = await Parse.Cloud.run('getContractSymbols', {
      address: dfaddress,
      abi: JSON.stringify(abiObject.get('data')),
      rpcUrl: rpcUrl
    });
    _symbols = symbolsResult.symbols || [];
  } catch (error) {
    console.warn(`Could not get symbols from DiamondFactory at ${dfaddress} via cloud function. Skipping diamond processing.`, error);
  }

  for (const symbol of _symbols) {
    let diamondAddress: string;
    try {
      const diamondAddressResult: any = await Parse.Cloud.run('getDiamondAddress', {
        address: dfaddress,
        abi: JSON.stringify(abiObject.get('data')),
        rpcUrl: rpcUrl,
        symbol: symbol
      });
      diamondAddress = diamondAddressResult.diamondAddress;
      if (!diamondAddress) {
        console.warn(`Received undefined diamond address for symbol ${symbol} from DiamondFactory at ${dfaddress}. Skipping.`);
        continue;
      }
    } catch (error) {
      console.warn(`Could not get diamond address for symbol ${symbol} from DiamondFactory at ${dfaddress} via cloud function. Skipping diamond creation.`, error);
      continue;
    }

    const diamond = await getOrCreateRecord(
      'Diamond',
      ['address', 'network'],
      [diamondAddress, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
      {
        address: diamondAddress,
        symbol: symbol,
        network: { "__type": "Pointer", className: "Blockchain", objectId: blockchain.id },
        diamondFactory: { __type: "Pointer", className: "DiamondFactory", objectId: diamondFactory.id },
      }
    ) as DiamondParseObject | undefined;
    if (diamond) await diamond.save();
  }
  return diamondFactory;
}

export async function importDeploymentArtifact(
  deploymentRecord: NetworkDeploymentData, // This is the raw artifact data from the JSON file
  blockchain: BlockchainParseObject,
  project: ProjectParseObject,
  deployment: DeploymentParseObject,
  rpcUrl: string
): Promise<DeploymentArtifactParseObject | undefined> {
  // Create/update the DeploymentArtifact Parse Object first
  const dArtifact = await getOrCreateRecord(
    'DeploymentArtifact',
    ['address', 'transactionHash', 'blockchain'],
    [deploymentRecord.artifact.address, deploymentRecord.artifact.transactionHash || '', { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }],
    {
      blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
      // Store the raw artifact JSON directly in the Parse Object
      artifact: deploymentRecord.artifact, // This now holds the JSON: DeploymentArtifactJson
      // Populate other direct fields from the JSON if needed, or rely on artifact.fieldName
      name: deploymentRecord.artifact.contractName, // or deploymentRecord.name
      address: deploymentRecord.artifact.address,
      transactionHash: deploymentRecord.artifact.transactionHash,
      // other direct fields from DeploymentArtifactParseObject that map from DeploymentArtifactJson
      abi: deploymentRecord.artifact.abi,
      args: deploymentRecord.artifact.args,
      receipt: deploymentRecord.artifact.receipt,
      solcInputHash: deploymentRecord.artifact.solcInputHash,
      deployedBytecode: deploymentRecord.artifact.deployedBytecode,
      libraries: deploymentRecord.artifact.libraries,
      storageLayout: deploymentRecord.artifact.storageLayout,
      metadata: deploymentRecord.artifact.metadata,
      devdoc: deploymentRecord.artifact.devdoc,
      userdoc: deploymentRecord.artifact.userdoc,
      // sourceCode and rpcUrl are part of DeploymentArtifactJson, accessed via dArtifact.get('artifact').sourceCode
    }
  ) as DeploymentArtifactParseObject | undefined;

  if (!dArtifact) {
    console.error(`Failed to create or update DeploymentArtifact for ${deploymentRecord.artifact.contractName} at ${deploymentRecord.artifact.address}`);
    return undefined;
  }
  await dArtifact.save();

  // Now use dArtifact (which holds the artifact JSON in its 'artifact' field) for subsequent imports
  const artifactJson = dArtifact.get('artifact') as NetworkDeploymentData['artifact'];

  const abiObject = await importDeploymentArtifactAbi(blockchain, dArtifact); // dArtifact.get('abi') is used by this func
  if (!abiObject) {
    console.error(`Failed to import ABI for ${artifactJson.contractName}`);
    return undefined;
  }

  const smartContract = await importDeploymentArtifactSmartContract(blockchain, dArtifact, abiObject);
  if (!smartContract) {
    console.error(`Failed to import SmartContract for ${artifactJson.contractName}`);
    return undefined;
  }

  if (artifactJson.devdoc) {
    await getOrCreateRecord('Devdoc', ['artifact'], [{ "__type": "Pointer", "className": "DeploymentArtifact", "objectId": dArtifact.id }], {
      blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
      artifact: { __type: "Pointer", className: "DeploymentArtifact", objectId: dArtifact.id },
      data: artifactJson.devdoc,
    }) as DevdocParseObject | undefined;
  }

  if (artifactJson.userdoc) {
    await getOrCreateRecord('Userdoc', ['artifact'], [{ "__type": "Pointer", "className": "DeploymentArtifact", "objectId": dArtifact.id }], {
      blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
      artifact: { __type: "Pointer", className: "DeploymentArtifact", objectId: dArtifact.id },
      data: artifactJson.userdoc,
    }) as UserdocParseObject | undefined;
  }

  if (artifactJson.deployedBytecode) {
    await getOrCreateRecord('Bytecode', ['address', 'network'], [artifactJson.address, { "__type": "Pointer", "className": "Blockchain", "objectId": blockchain.id }], {
      blockchain: { __type: "Pointer", className: "Blockchain", objectId: blockchain.id },
      deployment: { __type: "Pointer", className: "Deployment", objectId: deployment.id },
      abi: { __type: "Pointer", className: "Abi", objectId: abiObject.id },
      bytecode: artifactJson.deployedBytecode,
      contractName: artifactJson.contractName,
      name: artifactJson.name, // Assuming name exists on artifactJson
      address: artifactJson.address,
    }) as BytecodeParseObject | undefined;
  }

  if (artifactJson.sourceCode) { // Check on artifactJson
    await importDeploymentArtifactSourceCode(blockchain, dArtifact); // This function expects dArtifact
  }

  if (artifactJson.contractName === 'DiamondFactory') {
    await importDeploymentArtifactDiamondFactory(blockchain, dArtifact, abiObject, deployment, smartContract, rpcUrl);
  }

  const eventDefs = await getRecords('EventDefinition', ['abi'], [{ "__type": "Pointer", "className": "Abi", "objectId": abiObject.id }]) as EventDefinitionParseObject[];
  for (const ed of eventDefs) {
    await importDeploymentArtifactEventListener(blockchain, project, ed, artifactJson.address);
  }

  return dArtifact;
}