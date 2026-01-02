const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

let firebaseInitialized = false;
let dbInstance = null;
let adminInstance = null;

function initializeFirebase() {
  // Return existing instances if already initialized
  if (firebaseInitialized && dbInstance && adminInstance) {
    return {
      db: dbInstance,
      admin: adminInstance,
      verifyToken: verifyTokenFunction
    };
  }

  try {
    // Path to service account file
    const serviceAccountPath = process.env.NETLIFY
      ? '/var/task/config/firebase/serviceAccountKey.json'  // Netlify Lambda path
      : path.join(__dirname, '../../config/firebase/serviceAccountKey.json');

    // Read service account file
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });
    }

    // Initialize Firestore
    const db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    // Cache instances
    dbInstance = db;
    adminInstance = admin;
    firebaseInitialized = true;

    console.log('Firebase Admin initialized successfully');
    
    console.log('Firebase Admin SDK and Firestore initialized successfully');
    
    return {
      db,
      admin,
      verifyToken: verifyTokenFunction
    };
    
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

async function verifyTokenFunction(token) {
  if (!token) return null;
  try {
    // Remove 'Bearer ' prefix if present
    const idToken = token.startsWith('Bearer ') ? token.split('Bearer ')[1] : token;
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

module.exports = { initializeFirebase };
