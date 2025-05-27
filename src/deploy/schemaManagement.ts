/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { getAllSchemas, createSchemas, getRecords } from '@/parse/parseService';
import { EventListenerParseObject } from './interfaces';

export const collectionsToManage = [
  'Abi',
  'Bytecode',
  'Deployment',
  'DeploymentArtifact',
  'Diamond',
  'DiamondFacet',
  'DiamondFactory',
  'Event',
  'EventDefinition',
  'EventListener',
  'ExternalOrder',
  'Log',
  'Method',
  'Token',
  'Transaction',
  'Organization',
  'Project',
  'SourceCode',
  'Devdoc',
  'Userdoc',
  'Registration',
  'MultiSale',
  'ERC721',
  'ERC1155',
  'ERC20',
  'Configuration',
];

export async function createSchema() {
  const schemas = await getAllSchemas();
  if (schemas) {
    await createSchemas(
      collectionsToManage
    );

    const eventListeners = await getRecords('EventListener') as EventListenerParseObject[];
    if (eventListeners) {
      const eventListenerNames = eventListeners.map(
        (eventListener) => `${eventListener.get('name')}__e`
      );
      await createSchemas(eventListenerNames);
    }
  }
}

export async function deleteAllCollections(): Promise<void> {
  console.warn("deleteAllCollections is a destructive operation and should be used with extreme caution.");
  const collectionsToDelete = [
    'Abi',
    'Bytecode',
    'Deployment',
    'DeploymentArtifact',
    'Devdoc',
    'Diamond',
    'DiamondFacet',
    'DiamondFactory',
    'Event',
    'EventDefinition',
    'EventListener',
    'ExternalOrder',
    'Log',
    'Method',
    'Token',
    'Transaction',
    'Organization',
    'Project',
    'SourceCode',
    'Userdoc',
    'Registration',
    'MultiSale',
    'ERC721',
    'ERC1155',
    'ERC20',
    'Configuration',
  ];
  collectionsToDelete.forEach(async (collection) => {
    const query = new Parse.Query(collection);
    const records = await query.find();
    await Parse.Object.destroyAll(records);
  });
}