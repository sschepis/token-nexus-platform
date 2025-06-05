const { DfnsApiClient, DfnsDelegatedApiClient } = require('@dfns/sdk');
const { AsymmetricKeySigner } = require('@dfns/sdk-keysigner');

const apiClient = (appId, authToken) => {
  const signer = new AsymmetricKeySigner({
    credId: process.env.DFNS_CRED_ID,
    privateKey: process.env.DFNS_PRIVATE_KEY,
  });

  return new DfnsApiClient({
    appId,
    authToken: authToken ?? process.env.DFNS_AUTH_TOKEN,
    baseUrl: process.env.DFNS_API_URL,
    signer,
  });
};

const delegatedClient = (appId, authToken) =>
  new DfnsDelegatedApiClient({
    appId,
    authToken,
    baseUrl: process.env.DFNS_API_URL,
  });

module.exports = {
  apiClient,
  delegatedClient,
};
