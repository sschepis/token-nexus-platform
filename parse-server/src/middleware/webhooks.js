const crypto = require('crypto');
const Parse = require('parse/node');

Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JAVASCRIPT_KEY, process.env.PARSE_MASTER_KEY);
Parse.serverURL = process.env.PARSE_SERVER_URL;

function executePersonaWebhook(request) {
  const organizationId = request.params.organizationId; // Assuming organizationId is part of the URL path
  return Parse.Cloud.run('personaWebhookHandler', {
    body: request.body,
    organizationId: organizationId,
    personaSignature: request.get('Persona-Signature'), // Pass signature for re-verification
    rawBody: request.rawBody, // Pass rawBody for re-verification
  }, { useMasterKey: true });
}

function verifyWebhookSignature(req) {
  const personaSignature = req.get('Persona-Signature');

  if (!personaSignature) {
    console.error('Persona-Signature header missing.');

    return false;
  }

  // Extract the timestamp (t) and all v1 signatures
  const sigParams = {};

  personaSignature.split(',').forEach(pair => {
    const [key, value] = pair.split('=');

    sigParams[key.trim()] = value.trim();
  });

  const timestamp = sigParams.t;
  const signatures = personaSignature.split(' ').map(pair => pair.split('v1=')[1]);

  if (timestamp && signatures.length > 0) {
    // Generate HMAC from raw body
    const hmac = crypto
      .createHmac('sha256', process.env.PERSONA_WEBHOOK_SECRET)
      .update(`${timestamp}.${req.rawBody}`) // Use the rawBody here
      .digest('hex');

    // Check if any of the signatures match the generated HMAC
    const isVerified = signatures.some(signature =>
      crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(signature, 'utf8'))
    );

    if (!isVerified) {
      console.error('Webhook signature verification failed.');
    }

    return isVerified;
  }

  console.error('Invalid Persona-Signature format.');

  return false;
}

module.exports = {
  verifyWebhookSignature,
  executePersonaWebhook,
};
