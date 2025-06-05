const Parse = require('parse/node');
const ethers = require('ethers');

function validateAuthData(authData) {
  if (!authData.id) {
    throw new Parse.Error(
      Parse.Error.OBJECT_NOT_FOUND,
      'Siwe auth is invalid for this user. Missing user id.'
    );
  }

  const { message, signature } = authData;

  if (!message || !signature) {
    throw new Parse.Error(
      Parse.Error.OBJECT_NOT_FOUND,
      'Siwe auth is invalid for this user. Missing message or signature.'
    );
  }

  const trueAddress = ethers.verifyMessage(message, signature);

  if (!trueAddress) {
    throw new Parse.Error(
      Parse.Error.OBJECT_NOT_FOUND,
      'Siwe auth is invalid for this user. Invalid signature.'
    );
  }

  if (trueAddress === authData.id) {
    return Promise.resolve();
  }

  return Promise.reject();
}

function validateAppId() {
  return Promise.resolve();
}

module.exports = {
  validateAuthData,
  validateAppId,
};
