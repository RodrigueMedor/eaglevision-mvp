const { firebaseAdmin } = require('../config/firebase');
const { hashPassword, generateToken } = require('../utils/auth');

/**
 * Create a new user in Firebase Auth and return the user record
 * @param {Object} userData - User data including email and password
 * @returns {Promise<Object>} The created user record
 */
async function createUser(userData) {
  try {
    const { email, password, ...rest } = userData;
    
    // Create user in Firebase Auth
    const userRecord = await firebaseAdmin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}

/**
 * Get a user by email
 * @param {string} email - User's email
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @returns {Promise<Object|null>} The user document if found, null otherwise
 */
async function getUserByEmail(email, db) {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw new Error('Failed to get user');
  }
}

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @returns {Promise<Object|null>} The user document if found, null otherwise
 */
async function getUserById(userId, db) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw new Error('Failed to get user');
  }
}

/**
 * Update user data
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @returns {Promise<Object>} The updated user data
 */
async function updateUser(userId, updates, db) {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    
    const updatedDoc = await userRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
};
