/**
 * Schema definitions index
 */

const visualTesting = require('./visualTesting');
const CMSApplication = require('./CMSApplication');
const { createMarketingContentSchema, createSignupRequestSchema } = require('./MarketingContent');
const { createPageContentSchema, createComponentLibrarySchema } = require('./PageContent');
const AIAssistant = require('./AIAssistant');
const Dashboard = require('./Dashboard');
const ChainConfig = require('./ChainConfig');
const ContractDeployment = require('./ContractDeployment');
const CMSTrigger = require('./CMSTrigger');
const workflowSchema = require('./workflowSchema');

module.exports = {
  ...visualTesting,
  CMSApplication,
  createMarketingContentSchema,
  createSignupRequestSchema,
  createPageContentSchema,
  createComponentLibrarySchema,
  ...AIAssistant,
  ...Dashboard,
  ...ChainConfig,
  ...ContractDeployment,
  ...CMSTrigger,
  ...workflowSchema,
};
