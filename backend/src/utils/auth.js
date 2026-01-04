const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AuthenticationError } = require('../errors');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/**
 * Hash a password
 * @param {string} password - The password to hash
 * @returns {Promise<string>} The hashed password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 * @param {string} password - The password to check
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} True if the password matches the hash
 */
async function comparePasswords(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a JWT token
 * @param {string} userId - The user ID to include in the token
 * @param {string} [expiresIn=JWT_EXPIRES_IN] - Token expiration time
 * @returns {string} The generated JWT token
 */
function generateToken(userId, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
}

/**
 * Verify a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {object} The decoded token payload
 * @throws {AuthenticationError} If the token is invalid
 */
function verifyToken(token) {
  try {
    if (!token) {
      throw new AuthenticationError('No token provided');
    }
    
    // Remove 'Bearer ' prefix if present
    const tokenValue = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
    
    return jwt.verify(tokenValue, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    }
    throw new AuthenticationError('Invalid token');
  }
}

/**
 * Generate a refresh token
 * @param {string} userId - The user ID to include in the token
 * @returns {string} The generated refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

module.exports = {
  hashPassword,
  comparePasswords,
  generateToken,
  verifyToken,
  generateRefreshToken
};
