class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode || 500;
    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthenticationError extends CustomError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

class ValidationError extends CustomError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class NotFoundError extends CustomError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ForbiddenError extends CustomError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

class ConflictError extends CustomError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

class RateLimitError extends CustomError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

module.exports = {
  CustomError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
};
