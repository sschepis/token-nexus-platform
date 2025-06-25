module.exports = Parse => {
  const { apiClient } = require('../dfns'); // Renamed from './dfns' to '../dfns'
  const { ethers } = require('ethers');


  Parse.Cloud.beforeSave(Parse.User, async request => {
    const user = request.object;

    if (!user.existed() || user.dirty('authData')) {
      const authData = user.get('authData');

      if (authData) {
        const address = authData.wallet.id;

        if (!user.get('walletAddress') || user.get('walletAddress') !== address) {
          user.set('walletAddress', address);
          user.set('walletPreference', 'PRIVATE');
        }
      }
    }

    updateOnboarding(user);

    if (!user.get('organization')) {
      const query = new Parse.Query('Organization');

      query.equalTo('members.id', user.id);
      query.equalTo('members.status', 'Active');

      const organization = await query.first({ useMasterKey: true });

      if (organization) {
        user.set('organization', organization);
      }
    }
  });

  Parse.Cloud.define('initiateDfnsRegistration', async request => {
    const { email } = request.params;

    const appId = process.env.DFNS_APP_ID || 'dfns';

    const client = apiClient(appId);
    const challenge = await client.auth.createDelegatedRegistrationChallenge({
      body: { kind: 'EndUser', email },
    });

    return { success: true, data: challenge };
  });

  Parse.Cloud.define('completeDfnsRegistration', async request => {
    try {
      const user = request.user;
      const { signedChallenge, tempAuthToken } = request.params;

      if (!signedChallenge || !tempAuthToken) {
        throw new Error('Missing required parameters');
      }

      const appId = process.env.DFNS_APP_ID || 'dfns';

      const client = apiClient(appId, tempAuthToken);
      const registration = await client.auth.registerEndUser({
        body: {
          ...signedChallenge,
          wallets: [{ network: 'BaseSepolia' }],
        },
      });

      user.set('walletAddress', registration.wallets[0].address);
      user.set('walletId', registration.wallets[0].id);
      user.set('walletPreference', 'MANAGED');
      user.save(null, { sessionToken: user.getSessionToken() });

      return { success: true, data: registration };
    } catch (e) {
      return { success: false, data: e };
    }
  });

  const updateOnboarding = user => {
    const walletId = user.get('walletId');
    const privateWallet = user.get('walletPreference') === 'PRIVATE';
    const managedWallet = user.get('walletPreference') === 'MANAGED';

    if (
      user.get('firstName') &&
      user.get('lastName') &&
      user.get('email') &&
      user.get('emailVerified') &&
      user.get('termsAccepted') &&
      user.get('personaInquiryId') &&
      user.get('walletAddress') &&
      ((walletId && managedWallet) || privateWallet)
    ) {
      user.set('onboarded', true);
    } else {
      user.set('onboarded', false);
    }
  };
};
