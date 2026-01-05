'use strict';

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

/* =====================================================
   ENV + CONFIG
===================================================== */

const FIREBASE_CONFIG = {
  requiredVars: [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY'
  ],
  options: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
  }
};

const isDevelopment = process.env.NODE_ENV !== 'production';
let firebaseInitialized = false;
let dbInstance = null;
let authInstance = null;

/* =====================================================
   ERROR CLASSES
===================================================== */

class FirebaseInitializationError extends Error {
  constructor(message) {
    super(`Firebase Initialization Error: ${message}`);
    this.name = 'FirebaseInitializationError';
  }
}

class FirebaseAuthError extends Error {
  constructor(message, code = 'auth/error') {
    super(message);
    this.name = 'FirebaseAuthError';
    this.code = code;
  }
}

/* =====================================================
   MOCK IMPLEMENTATION (DEV ONLY)
===================================================== */

const mockDataStore = {};

const mockVerifyToken = async () => ({
  uid: 'dev-user',
  email: 'dev@example.com',
  email_verified: true,
  role: 'admin'
});

const mockFirebase = {
  db: {
    collection: (collectionName) => {
      if (!mockDataStore[collectionName]) {
        mockDataStore[collectionName] = new Map();
      }

      return {
        where: (field, op, value) => ({
          get: async () => {
            const items = Array.from(mockDataStore[collectionName].values())
                .filter(item => item[field] === value);

            return {
              empty: items.length === 0,
              docs: items.map(i => ({
                id: i.id,
                data: () => i,
                exists: true
              }))
            };
          }
        }),

        orderBy: (field, direction = 'asc') => ({
          get: async () => {
            const items = Array.from(mockDataStore[collectionName].values())
                .sort((a, b) =>
                    direction === 'asc'
                        ? a[field] > b[field] ? 1 : -1
                        : a[field] < b[field] ? 1 : -1
                );

            return {
              empty: items.length === 0,
              docs: items.map(i => ({
                id: i.id,
                data: () => i,
                exists: true
              }))
            };
          }
        }),

        limit: (count) => ({
          get: async () => {
            const items = Array.from(mockDataStore[collectionName].values())
                .slice(0, count);

            return {
              empty: items.length === 0,
              docs: items.map(i => ({
                id: i.id,
                data: () => i,
                exists: true
              }))
            };
          }
        }),

        get: async () => ({
          empty: mockDataStore[collectionName].size === 0,
          docs: Array.from(mockDataStore[collectionName].values()).map(i => ({
            id: i.id,
            data: () => i,
            exists: true
          }))
        }),

        add: async (data) => {
          const id = `doc_${Date.now()}`;
          mockDataStore[collectionName].set(id, { ...data, id });
          return { id };
        },

        doc: (id) => ({
          get: async () => ({
            exists: mockDataStore[collectionName].has(id),
            data: () => mockDataStore[collectionName].get(id),
            id
          }),
          set: async (data) => {
            mockDataStore[collectionName].set(id, { ...data, id });
          },
          delete: async () => {
            mockDataStore[collectionName].delete(id);
          }
        })
      };
    }
  },

  auth: {
    verifyIdToken: mockVerifyToken
  }
};

/* =====================================================
   INITIALIZATION
===================================================== */

function initializeFirebase() {
  if (firebaseInitialized) {
    return {
      db: dbInstance || mockFirebase.db,
      auth: authInstance || mockFirebase.auth
    };
  }

  if (isDevelopment && process.env.USE_MOCK_FIREBASE !== 'false') {
    firebaseInitialized = true;
    return {
      db: mockFirebase.db,
      auth: mockFirebase.auth
    };
  }

  const missing = FIREBASE_CONFIG.requiredVars.filter(v => !process.env[v]);
  if (missing.length) {
    throw new FirebaseInitializationError(
        `Missing env vars: ${missing.join(', ')}`
    );
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          project_id: process.env.FIREBASE_PROJECT_ID,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        ...FIREBASE_CONFIG.options
      });
    }

    dbInstance = getFirestore();
    authInstance = admin.auth();
    firebaseInitialized = true;

    return { db: dbInstance, auth: authInstance };
  } catch (err) {
    if (isDevelopment) {
      return {
        db: mockFirebase.db,
        auth: mockFirebase.auth
      };
    }
    throw new FirebaseInitializationError(err.message);
  }
}

/* =====================================================
   TOKEN VERIFICATION
===================================================== */

async function verifyToken(token) {
  if (!token) {
    throw new FirebaseAuthError('No token provided', 'auth/no-token');
  }

  if (!authInstance) {
    initializeFirebase();
  }

  try {
    const decoded = await authInstance.verifyIdToken(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      email_verified: decoded.email_verified || false,
      role: decoded.role || 'user',
      claims: decoded
    };
  } catch (err) {
    throw new FirebaseAuthError(
        'Invalid or expired token',
        err.code || 'auth/invalid-token'
    );
  }
}

/* =====================================================
   EXPORTS
===================================================== */

module.exports = {
  initialize: () => {
    const { db, auth } = initializeFirebase();
    return { db, auth, verifyToken };
  },

  verifyToken,

  get db() {
    if (!dbInstance) initializeFirebase();
    return dbInstance || mockFirebase.db;
  },

  get auth() {
    if (!authInstance) initializeFirebase();
    return authInstance || mockFirebase.auth;
  },

  FirebaseInitializationError,
  FirebaseAuthError
};
