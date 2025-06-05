"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationById = getOrganizationById;
exports.createProjectFor = createProjectFor;
exports.createDeploymentForProject = createDeploymentForProject;
exports.getDeploymentForProject = getDeploymentForProject;
/* eslint-disable @typescript-eslint/no-explicit-any */
const parse_1 = __importDefault(require("parse"));
const parseService_1 = require("@/parse/parseService");
/**
 * Fetch an Organization object by its ID.
 * @param organizationId The ID of the organization.
 * @returns The Organization Parse object or undefined if not found.
 */
async function getOrganizationById(organizationId) {
    try {
        const organization = await (0, parseService_1.getRecordById)('Organization', organizationId);
        if (!organization) {
            console.error(`Organization with ID ${organizationId} not found.`);
            return undefined;
        }
        return organization;
    }
    catch (error) {
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
async function createProjectFor(name, organization) {
    // create the system project record
    const project = await (0, parseService_1.getOrCreateRecord)('Project', ['name', 'organization'], // Use name and organization for uniqueness
    [name, { "__type": "Pointer", "className": "Organization", "objectId": organization.id }], // Pass organization as a Pointer
    {
        name,
        code: name.toUpperCase(),
        description: name,
        organization: {
            __type: 'Pointer',
            className: 'Organization',
            objectId: organization.id,
        },
    });
    if (project)
        await project.save();
    return project;
}
/**
 * create the deployment for the project in the Parse database
 * @param project
 * @param name
 * @param description
 * @returns
 */
async function createDeploymentForProject(project, name, description) {
    // create the system deployment record
    const deployment = await (0, parseService_1.getOrCreateRecord)('Deployment', ['name', 'project'], [name, { "__type": "Pointer", "className": "Project", "objectId": project.id }], {
        name,
        code: name.toUpperCase(),
        description: description,
        project: {
            __type: 'Pointer',
            className: 'Project',
            objectId: project.id,
        },
    });
    if (deployment) {
        // add the reployment relation to the project
        project.relation('deployments').add([deployment]);
        await project.save();
    }
    return deployment;
}
async function getDeploymentForProject(project) {
    const query = new parse_1.default.Query('Deployment');
    query.equalTo('project', { "__type": "Pointer", "className": "Project", "objectId": project.id }); // Use Pointer for query
    const deployment = await query.first();
    return deployment;
}
