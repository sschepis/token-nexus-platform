const Parse = require('parse/node');
const TestHelpers = require('./helpers');

describe('Organization Management', () => {
  let testHelpers;
  let adminUser;

  beforeAll(async () => {
    // Initialize TestHelpers
    testHelpers = new TestHelpers(Parse);

    // Create admin user
    adminUser = await testHelpers.createUserWithRole('admin');
  });

  afterAll(async () => {
    // Clean up test data
    await testHelpers.cleanup();
  });

  describe('Organization Creation', () => {
    let createdOrganization;

    it('should create an organization successfully', async () => {
      const orgData = {
        name: 'Test Organization',
        subdomain: 'test-org',
        industry: 'Technology',
        size: '1-10',
        description: 'A test organization for validation',
        plan: 'Starter',
        adminEmail: 'org.admin@example.com',
        adminPassword: 'TestPassword123!',
        adminFirstName: 'Org',
        adminLastName: 'Admin',
      };

      // Use cloud function to create organization
      createdOrganization = await Parse.Cloud.run('createOrganization', orgData, {
        sessionToken: adminUser.getSessionToken(),
      });

      expect(createdOrganization).toBeDefined();
      expect(createdOrganization.get('name')).toBe(orgData.name);
      expect(createdOrganization.get('subdomain')).toBe(orgData.subdomain);
      expect(createdOrganization.get('status')).toBe('Active');
    });

    it('should create an organization-specific admin role', async () => {
      const roleQuery = new Parse.Query(Parse.Role);
      roleQuery.equalTo('name', `${createdOrganization.id}_admin`);
      const orgAdminRole = await roleQuery.first({ useMasterKey: true });

      expect(orgAdminRole).toBeDefined();
    });

    it('should create a user for the organization admin', async () => {
      const userQuery = new Parse.Query(Parse.User);
      userQuery.equalTo('email', 'org.admin@example.com');
      const orgAdmin = await userQuery.first({ useMasterKey: true });

      expect(orgAdmin).toBeDefined();
      expect(orgAdmin.get('organization').id).toBe(createdOrganization.id);
    });
  });

  describe('Resource Usage Tracking', () => {
    let organization;

    beforeAll(async () => {
      const query = new Parse.Query('Organization');
      organization = await query.first({ useMasterKey: true });
    });

    it('should initialize resource usage for the organization', async () => {
      const resourceUsage = await Parse.Cloud.run(
        'getOrganizationResourceUsage',
        {
          organizationId: organization.id,
        },
        {
          sessionToken: adminUser.getSessionToken(),
        }
      );

      expect(resourceUsage).toBeDefined();
      expect(resourceUsage.get('storageUsed')).toBe(0);
      expect(resourceUsage.get('bandwidthUsed')).toBe(0);
      expect(resourceUsage.get('apiCalls')).toBe(0);
    });

    it('should allow updating resource quotas', async () => {
      const quotaData = {
        organizationId: organization.id,
        maxStorageGB: 200,
        maxRequestsPerMinute: 2000,
        maxConcurrentConnections: 200,
        maxQueryTimeout: 45000,
      };

      const updatedOrg = await Parse.Cloud.run('updateOrganizationQuotas', quotaData, {
        sessionToken: adminUser.getSessionToken(),
      });

      expect(updatedOrg.get('quotas').maxStorageGB).toBe(200);
      expect(updatedOrg.get('quotas').maxRequestsPerMinute).toBe(2000);
    });
  });

  describe('Organization Member Management', () => {
    let organization;

    beforeAll(async () => {
      const query = new Parse.Query('Organization');
      organization = await query.first({ useMasterKey: true });
    });

    it('should add a new member to the organization', async () => {
      const memberData = {
        organizationId: organization.id,
        action: 'add',
        email: 'new.member@example.com',
        role: 'read',
      };

      const updatedOrg = await Parse.Cloud.run('manageOrganizationMembers', memberData, {
        sessionToken: adminUser.getSessionToken(),
      });

      expect(updatedOrg.get('members')).toHaveLength(1);
      expect(updatedOrg.get('members')[0].email).toBe('new.member@example.com');
    });

    it('should remove a member from the organization', async () => {
      const memberToRemove = await new Parse.Query(Parse.User)
        .equalTo('email', 'new.member@example.com')
        .first({ useMasterKey: true });

      const removeData = {
        organizationId: organization.id,
        action: 'remove',
        userId: memberToRemove.id,
      };

      const updatedOrg = await Parse.Cloud.run('manageOrganizationMembers', removeData, {
        sessionToken: adminUser.getSessionToken(),
      });

      expect(updatedOrg.get('members')).toHaveLength(0);
    });
  });
});
