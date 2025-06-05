/* global Parse */

// Real capabilities by tier (no mock data)
const capabilities = {
  basic: [
    {
      id: 'basic-help',
      name: 'Basic Assistance',
      description: 'Get help with navigation and basic features',
      minimum_tier: 'basic',
      category: 'system',
    },
    {
      id: 'content-suggestions',
      name: 'Content Suggestions',
      description: 'Get basic content suggestions for your pages',
      minimum_tier: 'basic',
      category: 'content',
    },
  ],
  professional: [
    {
      id: 'content-optimization',
      name: 'Content Optimization',
      description: 'Advanced content optimization and SEO suggestions',
      minimum_tier: 'professional',
      category: 'content',
    },
    {
      id: 'workflow-analysis',
      name: 'Workflow Analysis',
      description: 'Analyze and optimize your workflows',
      minimum_tier: 'professional',
      category: 'automation',
    },
  ],
  enterprise: [
    {
      id: 'predictive-analytics',
      name: 'Predictive Analytics',
      description: 'AI-powered predictions and insights',
      minimum_tier: 'enterprise',
      category: 'analytics',
    },
    {
      id: 'custom-automation',
      name: 'Custom Automation',
      description: 'Create complex AI-driven automations',
      minimum_tier: 'enterprise',
      category: 'automation',
    },
  ],
};

// Shared helper functions
async function getUserTierAndOrganization(user) {
  const [userSettings, organization] = await Promise.all([
    new Parse.Query('UserSettings').equalTo('user', user).first({ useMasterKey: true }),
    Parse.Cloud.run('getOrganization', { userId: user.id }, { useMasterKey: true }),
  ]);

  if (!organization) {
    throw new Error('User must be associated with an organization');
  }

  const tier = userSettings?.get('assistantTier') || 'basic';
  return { tier, organization };
}

function getCapabilitiesForTier(tier) {
  let userCapabilities = [];
  
  switch (tier) {
    case 'enterprise':
      userCapabilities = [
        ...capabilities.basic,
        ...capabilities.professional,
        ...capabilities.enterprise,
      ];
      break;
    case 'professional':
      userCapabilities = [...capabilities.basic, ...capabilities.professional];
      break;
    default:
      userCapabilities = [...capabilities.basic];
  }
  
  return userCapabilities;
}

module.exports = {
  capabilities,
  getUserTierAndOrganization,
  getCapabilitiesForTier
};