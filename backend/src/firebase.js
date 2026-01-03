const admin = require('firebase-admin');

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
    // Get service account from environment variable
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
    }

    // Parse the service account JSON
    const serviceAccountJson = typeof serviceAccount === 'string' 
      ? JSON.parse(serviceAccount)
      : serviceAccount;
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
        databaseURL: `https://${serviceAccountJson.project_id}.firebaseio.com`,
        storageBucket: `${serviceAccountJson.project_id}.appspot.com`
      });
    }
    
    // Initialize Firestore
    const db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    
    // Cache instances
    dbInstance = db;
    adminInstance = admin;
    firebaseInitialized = true;
    
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
