module.exports = Parse => {
  const { DfnsApiClient, DfnsDelegatedApiClient } = require('@dfns/sdk');
  const { AsymmetricKeySigner } = require('@dfns/sdk-keysigner');
  const { encrypt, decrypt } = require('../../utils/cryptoUtils'); // Corrected path
  const { withOrganizationContext } = require('../../middleware/organizationContextMiddleware'); // Corrected path
  const crypto = require('crypto');

  // Helper to get Dfns API client for a specific organization
  async function getDfnsApiClientForOrg(organizationId) {
    const OrgIntegrationConfig = Parse.Object.extend('OrgIntegrationConfig');
    const organizationQuery = new Parse.Query('Organization'); 
    const organization = await organizationQuery.get(organizationId, { useMasterKey: true });

    const configQuery = new Parse.Query(OrgIntegrationConfig);
    configQuery.equalTo('organization', organization);
    const orgConfig = await configQuery.first({ useMasterKey: true });

    if (!orgConfig) {
      throw new Parse.Cloud.Error('Configuration Error', `No Dfns configuration found for organizationId: ${organizationId}`);
    }

    const appId = orgConfig.get('dfnsAppId');
    const privateKey = orgConfig.get('dfnsPrivateKey'); 
    const credId = orgConfig.get('dfnsCredId');
    const dfnsApiUrl = process.env.DFNS_API_URL;

    if (!appId || !privateKey || !credId || !dfnsApiUrl) {
      throw new Parse.Cloud.Error('Configuration Error', 'Missing Dfns API credentials for this organization.');
    }

    const signer = new AsymmetricKeySigner({
      credId,
      privateKey,
    });

    return new DfnsApiClient({
      appId,
      baseUrl: dfnsApiUrl,
      signer,
    });
  }

  // Cloud function to provision a Dfns wallet for a user
  Parse.Cloud.define('provisionDfnsWallet', withOrganizationContext(async (request) => {
    if (!request.master) {
      throw new Parse.Cloud.Error('Unauthorized', 'This function can only be called from Cloud Code with master key or other secure contexts.');
    }

    const { userId } = request.params;
    const { organizationId } = request;

    if (!userId) { 
      throw new Parse.Cloud.Error('Invalid Request', 'userId is required.');
    }

    try {
      const user = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });
      if (!user) {
        throw new Parse.Cloud.Error('NotFound', `User with ID ${userId} not found.`);
      }

      if (user.get('organization')?.id !== organizationId) {
        throw new Parse.Cloud.Error('Unauthorized', 'User does not belong to the specified organization.');
      }

      const dfnsClient = await getDfnsApiClientForOrg(organizationId);

      const newWalletId = `dfns_wallet_${userId}_${Date.now()}`;
      const newWalletAddress = `0x${crypto.randomBytes(20).toString('hex')}`;

      user.set('dfnsWalletId', newWalletId);
      user.set('walletAddress', newWalletAddress);
      user.set('dfnsWalletProvisioned', true);
      await user.save(null, { useMasterKey: true });

      console.log(`Dfns wallet provisioned for user ${userId} in organization ${organizationId}: ${newWalletAddress}`);
      return { status: 'success', walletId: newWalletId, walletAddress: newWalletAddress };

    } catch (error) {
      console.error(`Error provisioning Dfns wallet for user ${userId} in organization ${organizationId}:`, error);
      throw error;
    }
  }));

  // Cloud function to execute Dfns transactions (placeholder)
  Parse.Cloud.define('executeDfnsTransaction', async (request) => {
    console.log('Execute Dfns Transaction invoked:', request.params);
    return { status: 'success', message: 'Transaction execution placeholder.' };
  });

  // Cloud function to list Dfns wallets for an organization
  Parse.Cloud.define('listOrgDfnsWallets', withOrganizationContext(async (request) => {
    const { organization, organizationId } = request;
    const { limit = 10, skip = 0 } = request.params;

    try {
      const dfnsClient = await getDfnsApiClientForOrg(organizationId);

      const query = new Parse.Query(Parse.User);
      query.equalTo('organization', organization);
      query.exists('dfnsWalletId');
      query.limit(limit);
      query.skip(skip);
      query.select('objectId', 'username', 'dfnsWalletId', 'walletAddress');

      const usersWithWallets = await query.find({ useMasterKey: true });

      const wallets = usersWithWallets.map(user => ({
        userId: user.id,
        username: user.get('username'),
        dfnsWalletId: user.get('dfnsWalletId'),
        walletAddress: user.get('walletAddress'),
      }));

      return { success: true, wallets };

    } catch (error) {
      console.error(`Error listing Dfns wallets for organization ${organizationId}:`, error);
      throw new Parse.Cloud.Error('Dfns Wallets Fetch Failed', error.message || 'Unable to fetch Dfns wallets.');
    }
  }));

  // Cloud function to list Dfns transactions for an organization/user (placeholder)
  Parse.Cloud.define('listOrgDfnsTransactions', withOrganizationContext(async (request) => {
    const { organizationId, userId, limit = 10, skip = 0 } = request.params;

    if (!organizationId) { 
      throw new Parse.Cloud.Error('Invalid Request', 'organizationId is required.');
    }

    try {
      const dfnsClient = await getDfnsApiClientForOrg(organizationId);

      const transactions = [
        { id: 'txn1', type: 'transfer', amount: '1.0 ETH', status: 'completed', date: new Date().toISOString() },
        { id: 'txn2', type: 'approve', amount: 'Unlimited DAI', status: 'pending', date: new Date().toISOString() },
      ];

      return { success: true, transactions };

    } catch (error) {
      console.error(`Error listing Dfns transactions for organization ${organizationId}:`, error);
      throw new Parse.Cloud.Error('Dfns Transactions Fetch Failed', error.message || 'Unable to fetch Dfns transactions.');
    }
  }));

  // Cloud function to check if Alchemy Analytics should be enabled
  Parse.Cloud.define('getAlchemyAnalyticsEnabledStatus', async (request) => {
    if (!request.user) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Authentication required.');
    }

    try {
      const SmartContract = Parse.Object.extend('SmartContract');
      const query = new Parse.Query(SmartContract);
      const count = await query.count({ useMasterKey: true });

      return { success: true, enabled: count > 0 };
    } catch (error) {
      console.error('Error in getAlchemyAnalyticsEnabledStatus:', error);
      throw new Parse.Cloud.Error('AlchemyAnalyticsError', error.message || 'Unable to determine Alchemy Analytics status.');
    }
  });
};