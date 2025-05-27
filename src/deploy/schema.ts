import { getAllSchemas, createSchemas, getRecords } from '../parse/parseService';
import { EventListenerParseObject } from './interfaces';

const collectionsToManage = [
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