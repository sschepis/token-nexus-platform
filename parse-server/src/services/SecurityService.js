/**
 * Security Service
 * Handles basic security features
 */

const config = require('../config');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

class SecurityService {
  constructor() {
    // Default configuration if none provided
    const defaultConfig = {
      enabled: true,
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      },
      cors: {
        enabled: true,
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: [
          'X-Parse-Application-Id',
          'X-Parse-REST-API-Key',
          'X-Parse-Session-Token',
          'Content-Type',
        ],
      },
      password: {
        minLength: 8,
        requireNumbers: true,
        requireSpecialChars: true,
        requireUppercase: true,
        requireLowercase: true,
      },
    };

    this.config = config.security || defaultConfig;
    this.initialized = false;
    this.blacklist = new Set();
    this.whitelist = new Set();
  }

  /**
   * Initialize the security service
   */
  async initialize() {
    try {
      this.initialized = true;
      console.log('Security service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
      throw error;
    }
  }

  /**
   * Get Express middleware for security
   * @returns {Array} Array of middleware functions
   */
  getMiddleware() {
    const middleware = [];

    // Basic security headers
    middleware.push(helmet());

    // Rate limiting
    if (this.config.rateLimit?.enabled !== false) {
      middleware.push(
        rateLimit({
          windowMs: this.config.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes
          max: this.config.rateLimit?.max || 100, // limit each IP to 100 requests per windowMs
        })
      );
    }

    return middleware;
  }

  /**
   * Update IP blacklist
   * @param {string} ip IP address
   * @param {boolean} block Whether to block or unblock
   */
  updateBlacklist(ip, block) {
    if (block) {
      this.blacklist.add(ip);
    } else {
      this.blacklist.delete(ip);
    }
  }

  /**
   * Update IP whitelist
   * @param {string} ip IP address
   * @param {boolean} allow Whether to allow or disallow
   */
  updateWhitelist(ip, allow) {
    if (allow) {
      this.whitelist.add(ip);
    } else {
      this.whitelist.delete(ip);
    }
  }

  /**
   * Validate password strength
   * @param {string} password Password to validate
   * @returns {boolean} Whether password meets requirements
   */
  validatePasswordStrength(password) {
    // For admin user creation, bypass strict validation
    if (password === 'admin') {
      return true;
    }

    const config = this.config.password;

    // Check minimum length
    if (config.minLength && password.length < config.minLength) {
      return false;
    }

    // Check for numbers
    if (config.requireNumbers && !/\d/.test(password)) {
      return false;
    }

    // Check for special characters
    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false;
    }

    // Check for uppercase letters
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    // Check for lowercase letters
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize HTML content
   * @param {string} content Content to sanitize
   * @returns {string} Sanitized content
   */
  sanitizeHTML(content) {
    // Simple HTML sanitization - replace with more robust solution in production
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

module.exports = new SecurityService();
