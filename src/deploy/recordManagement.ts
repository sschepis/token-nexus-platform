/* eslint-disable @typescript-eslint/no-explicit-any */
import Parse from 'parse';
import { getOrCreateRecord, getRecordById } from '@/parse/parseService';
import { OrganizationParseObject, ProjectParseObject, DeploymentParseObject, ParseQuery } from './interfaces';

/**
 * Fetch an Organization object by its ID.
 * @param organizationId The ID of the organization.
 * @returns The Organization Parse object or undefined if not found.
 */
export async function getOrganizationById(organizationId: string): Promise<OrganizationParseObject | undefined> {
  try {
    const organization = await getRecordById<OrganizationParseObject>('Organization', organizationId);
    if (!organization) {
      console.error(`Organization with ID ${organizationId} not found.`);
      return undefined;
    }
    return organization;
  } catch (error) {
    console.error(`Error fetching organization with ID ${organizationId}:`, error);
    return undefined;
  }
}

/**
 * create the project for the deployment in the Parse database
 * Modified to link the project to an organization.
 * @param name
 * @param organization The Organization Parse object.
 * @returns
 */
export async function createProjectFor(name: string, organization: OrganizationParseObject): Promise<ProjectParseObject | undefined> {
  // create the system project record
  const project = await getOrCreateRecord(
    'Project',
    ['name', 'organization'], // Use name and organization for uniqueness
    [name, { "__type": "Pointer", "className": "Organization", "objectId": organization.id }], // Pass organization as a Pointer
    {
      name,
      code: name.toUpperCase(),
      description: name,
      organization: { // Link project to organization
        __type: 'Pointer',
        className: 'Organization',
        objectId: organization.id,
      },
    }
  ) as ProjectParseObject | undefined;
  if (project) await project.save();
  return project;
}

/**
 * create the deployment for the project in the Parse database
 * @param project
 * @param name
 * @param description
 * @returns
 */
export async function createDeploymentForProject(
  project: ProjectParseObject,
  name: string,
  description: string
): Promise<DeploymentParseObject | undefined> {
  // create the system deployment record
  const deployment = await getOrCreateRecord('Deployment', ['name', 'project'], [name, { "__type": "Pointer", "className": "Project", "objectId": project.id }], { // Pass project as a Pointer
    name,
    code: name.toUpperCase(),
    description: description,
    project: {
      __type: 'Pointer',
      className: 'Project',
      objectId: project.id,
    },
  }) as DeploymentParseObject | undefined;

  if (deployment) {
      // add the reployment relation to the project
      project.relation('deployments').add([deployment]);
      await project.save();
  }
  return deployment;
}

export async function getDeploymentForProject(project: ProjectParseObject): Promise<DeploymentParseObject | undefined> {
  const query = new Parse.Query('Deployment') as ParseQuery<DeploymentParseObject>;
  query.equalTo('project', { "__type": "Pointer", "className": "Project", "objectId": project.id }); // Use Pointer for query
  const deployment = await query.first();
  return deployment;
}