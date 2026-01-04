const { v4: uuidv4 } = require('uuid');
const { db } = require('../firebase');
const emailConfig = require('../config/email');

/**
 * Generate a verification token and save it to the database
 * @param {string} email - User's email address
 * @returns {Promise<{token: string, expires: Date}>} Token and expiration date
 */
async function generateVerificationToken(email) {
  const token = uuidv4();
  const expires = new Date();
  expires.setHours(expires.getHours() + 24); // 24 hours expiration

  await db.collection('emailVerifications').add({
    email,
    token,
    expires,
    used: false,
    createdAt: new Date().toISOString()
  });

  return { token, expires };
}

/**
 * Verify a token from the database
 * @param {string} token - The token to verify
 * @param {string} email - The email associated with the token
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
async function verifyToken(token, email) {
  if (!token || !email) return false;

  const snapshot = await db.collection('emailVerifications')
    .where('token', '==', token)
    .where('email', '==', email)
    .where('used', '==', false)
    .where('expires', '>', new Date().toISOString())
    .limit(1)
    .get();

  if (snapshot.empty) return false;

  // Mark token as used
  const doc = snapshot.docs[0];
  await doc.ref.update({ used: true, usedAt: new Date().toISOString() });

  return true;
}

/**
 * Get the verification URL for an email
 * @param {string} token - The verification token
 * @param {string} email - The user's email
 * @returns {string} The verification URL
 */
function getVerificationUrl(token, email) {
  return `${emailConfig.frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
}

module.exports = {
  generateVerificationToken,
  verifyToken,
  getVerificationUrl
};
