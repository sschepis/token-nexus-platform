/**
 * Dashboard-specific Cloud Functions
 */

const Parse = require('parse/node');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({
      filename: 'parse-server/logs/dashboard.log',
      level: 'info',
    }),
  ],
});

Parse.Cloud.define(
  'getUserDetails',
  async req => {
    if (!req.params.object) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'No user object provided');
    }

    const user = req.params.object;

    const query = new Parse.Query('Organization');

    query.equalTo('createdBy', user);
    const organizations = await query.find({ useMasterKey: true });

    const resourceQuery = new Parse.Query('ResourceUsage');

    resourceQuery.equalTo('organizationId', organizations[0]?.id);
    const resourceUsage = await resourceQuery.first({ useMasterKey: true });

    return {
      panel: {
        segments: [
          {
            title: 'Account Details',
            items: [
              {
                type: 'text',
                text: `Account created ${user.get('createdAt').toLocaleDateString()}`,
              },
              {
                type: 'keyValue',
                key: 'Email',
                value: user.get('email'),
              },
              {
                type: 'keyValue',
                key: 'Role',
                value: user.get('role') || 'User',
              },
            ],
          },
          {
            title: 'Organizations',
            items: [
              {
                type: 'table',
                columns: [
                  { name: 'Name', type: 'string' },
                  { name: 'Plan', type: 'string' },
                  { name: 'Status', type: 'string' },
                ],
                rows: organizations.map(org => ({
                  Name: org.get('name'),
                  Plan: org.get('plan'),
                  Status: org.get('status'),
                })),
              },
            ],
          },
          {
            title: 'Resource Usage',
            items: resourceUsage
              ? [
                  {
                    type: 'keyValue',
                    key: 'Storage Used',
                    value: `${Math.round(resourceUsage.get('storageUsed') / 1024 / 1024)}MB`,
                  },
                  {
                    type: 'keyValue',
                    key: 'API Calls',
                    value: resourceUsage.get('apiCalls').toString(),
                  },
                ]
              : [
                  {
                    type: 'text',
                    text: 'No resource usage data available',
                  },
                ],
          },
        ],
      },
    };
  },
  {
    requireMaster: true,
  }
);

Parse.Cloud.define(
  'getOrganizationDetails',
  async req => {
    if (!req.params.object) {
      throw new Parse.Error(Parse.Error.INVALID_PARAMS, 'No organization object provided');
    }

    const organization = req.params.object;

    const resourceQuery = new Parse.Query('ResourceUsage');

    resourceQuery.equalTo('organizationId', organization.id);
    const resourceUsage = await resourceQuery.first({ useMasterKey: true });

    const roleQuery = new Parse.Query(Parse.Role);

    roleQuery.equalTo('name', `${organization.id}_admin`);
    const adminRole = await roleQuery.first({ useMasterKey: true });
    const adminUsers = adminRole
      ? await adminRole.getUsers().query().find({ useMasterKey: true })
      : [];

    return {
      panel: {
        segments: [
          {
            title: 'Organization Details',
            items: [
              {
                type: 'keyValue',
                key: 'Name',
                value: organization.get('name'),
              },
              {
                type: 'keyValue',
                key: 'Plan',
                value: organization.get('plan'),
              },
              {
                type: 'keyValue',
                key: 'Status',
                value: organization.get('status'),
              },
              {
                type: 'keyValue',
                key: 'Industry',
                value: organization.get('industry'),
              },
            ],
          },
          {
            title: 'Resource Usage',
            items: resourceUsage
              ? [
                  {
                    type: 'keyValue',
                    key: 'Storage Used',
                    value: `${Math.round(resourceUsage.get('storageUsed') / 1024 / 1024)}MB`,
                  },
                  {
                    type: 'keyValue',
                    key: 'API Calls',
                    value: resourceUsage.get('apiCalls').toString(),
                  },
                ]
              : [
                  {
                    type: 'text',
                    text: 'No resource usage data available',
                  },
                ],
          },
          {
            title: 'Administrators',
            items: [
              {
                type: 'table',
                columns: [
                  { name: 'Name', type: 'string' },
                  { name: 'Email', type: 'string' },
                ],
                rows: adminUsers.map(user => ({
                  Name: user.get('username'),
                  Email: user.get('email'),
                })),
              },
            ],
          },
        ],
      },
    };
  },
  {
    requireMaster: true,
  }
);

module.exports = {
  logger,
};
