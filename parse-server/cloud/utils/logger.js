/* eslint-disable no-console */
/**
 * Simple logger utility for Parse Cloud Functions.
 * Provides basic logging levels.
 * @param {string} name - The name of the logger (e.g., Cloud Function name).
 */
const createLogger = (name) => {
  const log = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${name}] [${level.toUpperCase()}]: ${message}`, ...args);
  };

  return {
    info: (message, ...args) => log('info', message, ...args),
    warn: (message, ...args) => log('warn', message, ...args),
    error: (message, ...args) => log('error', message, ...args),
    debug: (message, ...args) => log('debug', message, ...args),
  };
};

module.exports = createLogger;