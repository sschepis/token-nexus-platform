const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const ivLength = 16; // AES IV size is always 16 bytes

// Ensure this key is securely managed and consistent across deployments
const encryptionKey = process.env.ENCRYPTION_KEY; 

if (!encryptionKey) {
  console.error("CRITICAL ERROR: ENCRYPTION_KEY environment variable is not set. Data encryption/decryption will fail.");
  // In a real application, you might want to throw an error or exit the process here.
}

function encrypt(text) {
  if (!encryptionKey) {
    console.error("Encryption failed: ENCRYPTION_KEY is not set.");
    return text; // Return original text or handle error
  }
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!encryptionKey) {
    console.error("Decryption failed: ENCRYPTION_KEY is not set.");
    return text; // Return original text or handle error
  }
  const textParts = text.split(':');
  if (textParts.length !== 2) {
    console.error("Decryption failed: Invalid encrypted format.");
    return text; // Return original text or handle error
  }
  const iv = Buffer.from(textParts[0], 'hex');
  const encryptedText = Buffer.from(textParts[1], 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = {
  encrypt,
  decrypt
};