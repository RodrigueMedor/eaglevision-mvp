class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.extensions = { code: 'UNAUTHENTICATED' };
  }
}

class UserInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserInputError';
    this.extensions = { code: 'BAD_USER_INPUT' };
  }
}

module.exports = {
  AuthenticationError,
  UserInputError
};
