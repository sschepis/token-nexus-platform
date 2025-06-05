const Parse = require('parse/node');

class BaseError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends BaseError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

class NotFoundError extends BaseError {
  constructor(message) {
    super(message, 'NOT_FOUND', 404);
  }
}

class AuthenticationError extends BaseError {
  constructor(message) {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

class AuthorizationError extends BaseError {
  constructor(message) {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

class ConflictError extends BaseError {
  constructor(message) {
    super(message, 'CONFLICT_ERROR', 409);
  }
}

class RateLimitError extends BaseError {
  constructor(message) {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

class ServiceError extends BaseError {
  constructor(message) {
    super(message, 'SERVICE_ERROR', 503);
  }
}

/**
 * Handle and transform errors into appropriate error types
 * @param {Error} error Original error
 * @param {string} context Error context for logging
 * @returns {Error} Transformed error
 */
const handleError = (error, context = '') => {
  // If it's already one of our error types, return it
  if (error instanceof BaseError) {
    return error;
  }

  // Parse Server errors
  if (error.code) {
    switch (error.code) {
      case Parse.Error.OBJECT_NOT_FOUND:
        return new NotFoundError(error.message);
      case Parse.Error.INVALID_SESSION_TOKEN:
        return new AuthenticationError(error.message);
      case Parse.Error.OPERATION_FORBIDDEN:
        return new AuthorizationError(error.message);
      case Parse.Error.VALIDATION_ERROR:
        return new ValidationError(error.message);
      case Parse.Error.RATE_LIMIT_EXCEEDED:
        return new RateLimitError(error.message);
    }
  }

  // Log unexpected errors
  console.error(`Error in ${context}:`, error);

  // Default to ServiceError for unknown errors
  return new ServiceError(error.message || 'An unexpected error occurred');
};

module.exports = {
  BaseError,
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ServiceError,
  handleError,
};
