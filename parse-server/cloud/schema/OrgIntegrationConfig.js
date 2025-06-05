module.exports = {
  OrgIntegrationConfig: {
    className: 'OrgIntegrationConfig',
    fields: {
      organization: { type: 'Pointer', targetClass: 'Organization', required: true },
      dfnsAppId: { type: 'String' },
      dfnsPrivateKey: { type: 'String' }, // Will be encrypted
      dfnsCredId: { type: 'String' },
      personaWebhookSecret: { type: 'String' }, // Will be encrypted
      status: { type: 'String' }, // e.g., 'Configured', 'Active', 'Error'
    },
    classLevelPermissions: {
      find: { 'role:admin': true },
      count: { 'role:admin': true },
      get: { 'role:admin': true },
      create: { 'role:admin': true },
      update: { 'role:admin': true },
      delete: { 'role:admin': true },
      addField: { '*': false },
    },
  },
};