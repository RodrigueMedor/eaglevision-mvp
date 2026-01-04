const admin = require('firebase-admin');

let firebaseInitialized = false;
let dbInstance = null;
let adminInstance = null;

// Mock verify token function for development
const mockVerifyToken = async (token) => {
  console.warn('WARNING: Running in development mode with mock authentication');
  return { uid: 'dev-user-id', email: 'dev@example.com' };
};

// In-memory store for development
const mockDataStore = {
  users: new Map(),
  refreshTokens: new Map()
};

// Mock Firebase functions for development
const mockFirebase = {
  db: {
    collection: (collectionName) => {
      if (collectionName === 'users') {
        return {
          where: (field, op, value) => ({
            limit: (count) => ({
              get: async () => {
                const users = Array.from(mockDataStore.users.values())
                  .filter(user => user[field] === value)
                  .slice(0, count);
                return {
                  empty: users.length === 0,
                  docs: users.map(user => ({
                    id: user.id,
                    data: () => user,
                    exists: true
                  }))
                };
              }
            })
          }),
          add: async (data) => {
            const id = `user_${Date.now()}`;
            const userData = { ...data, id };
            mockDataStore.users.set(id, userData);
            return { id };
          },
          doc: (id) => ({
            get: async () => {
              const user = mockDataStore.users.get(id);
              return {
                exists: !!user,
                data: () => user,
                id: user?.id
              };
            },
            delete: async () => {
              mockDataStore.users.delete(id);
              return true;
            },
            set: async (data) => {
              mockDataStore.users.set(id, { ...data, id });
              return true;
            }
          })
        };
      } else if (collectionName === 'refreshTokens') {
        return {
          doc: (token) => ({
            set: async (data) => {
              mockDataStore.refreshTokens.set(token, data);
              return true;
            },
            get: async () => ({
              exists: mockDataStore.refreshTokens.has(token),
              data: () => mockDataStore.refreshTokens.get(token)
            }),
            delete: async () => {
              mockDataStore.refreshTokens.delete(token);
              return true;
            }
          })
        };
      }
      
      // Default collection handler
      const collection = {
        where: (field, operator, value) => {
          return {
            orderBy: (orderField, direction = 'asc') => {
              return {
                get: async () => {
                  let items = Array.from((mockDataStore[collectionName] || new Map()).values());
                  
                  // Apply filter if where was called
                  if (field && operator && value !== undefined) {
                    items = items.filter(item => {
                      const itemValue = item[field];
                      switch (operator) {
                        case '==': return itemValue === value;
                        case '>=': return itemValue >= value;
                        case '<=': return itemValue <= value;
                        case '>': return itemValue > value;
                        case '<': return itemValue < value;
                        case '!=': return itemValue !== value;
                        case 'array-contains': 
                          return Array.isArray(itemValue) && itemValue.includes(value);
                        default: return true;
                      }
                    });
                  }
                  
                  // Apply sorting if orderBy was called
                  if (orderField) {
                    items.sort((a, b) => {
                      const aVal = a[orderField];
                      const bVal = b[orderField];
                      if (aVal === bVal) return 0;
                      if (aVal === undefined) return 1;
                      if (bVal === undefined) return -1;
                      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                      return 0;
                    });
                  }
                  
                  return {
                    empty: items.length === 0,
                    docs: items.map(item => ({
                      id: item.id,
                      data: () => item,
                      exists: true
                    }))
                  };
                }
              };
            },
            get: async () => {
              let items = Array.from((mockDataStore[collectionName] || new Map()).values());
              
              // Apply filter if where was called
              if (field && operator && value !== undefined) {
                items = items.filter(item => {
                  const itemValue = item[field];
                  switch (operator) {
                    case '==': return itemValue === value;
                    case '>=': return itemValue >= value;
                    case '<=': return itemValue <= value;
                    case '>': return itemValue > value;
                    case '<': return itemValue < value;
                    case '!=': return itemValue !== value;
                    case 'array-contains': 
                      return Array.isArray(itemValue) && itemValue.includes(value);
                    default: return true;
                  }
                });
              }
              
              return {
                empty: items.length === 0,
                docs: items.map(item => ({
                  id: item.id,
                  data: () => item,
                  exists: true
                }))
              };
            }
          };
        },
        orderBy: (field, direction = 'asc') => {
          return {
            get: async () => {
              let items = Array.from((mockDataStore[collectionName] || new Map()).values());
              
              // Apply sorting
              items.sort((a, b) => {
                const aVal = a[field];
                const bVal = b[field];
                if (aVal === bVal) return 0;
                if (aVal === undefined) return 1;
                if (bVal === undefined) return -1;
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
                return 0;
              });
              
              return {
                empty: items.length === 0,
                docs: items.map(item => ({
                  id: item.id,
                  data: () => item,
                  exists: true
                }))
              };
            }
          };
        },
        limit: (count) => ({
          get: async () => {
            let items = Array.from((mockDataStore[collectionName] || new Map()).values());
            
            if (count) {
              items = items.slice(0, count);
            }
            
            return {
              empty: items.length === 0,
              docs: items.map(item => ({
                id: item.id,
                data: () => item,
                exists: true
              }))
            };
          }
        }),
        get: async () => {
          const items = Array.from((mockDataStore[collectionName] || new Map()).values());
          return {
            empty: items.length === 0,
            docs: items.map(item => ({
              id: item.id,
              data: () => item,
              exists: true
            }))
          };
        },
        add: async (data) => {
          const id = `doc_${Date.now()}`;
          if (!mockDataStore[collectionName]) {
            mockDataStore[collectionName] = new Map();
          }
          const docData = { ...data, id };
          mockDataStore[collectionName].set(id, docData);
          return { id, data: () => docData };
        },
        doc: (id) => ({
          get: async () => ({
            exists: mockDataStore[collectionName]?.has(id),
            data: () => mockDataStore[collectionName]?.get(id)
          })
        })
      };
    }
  },
  admin: {
    auth: () => ({
      verifyIdToken: mockVerifyToken
    })
  }
};

function initializeFirebase() {
  // If already initialized, return the instances
  if (firebaseInitialized) {
    return {
      db: dbInstance || mockFirebase.db,
      admin: adminInstance || mockFirebase.admin,
      verifyToken: verifyTokenFunction
    };
  }

  try {
    // Check if Firebase is configured
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      console.warn('WARNING: FIREBASE_SERVICE_ACCOUNT not set. Using mock Firebase for development.');
      firebaseInitialized = true;
      return {
        db: mockFirebase.db,
        admin: mockFirebase.admin,
        verifyToken: mockVerifyToken
      };
    }

    // If we get here, Firebase is configured but there's an error with the credentials
    console.warn('WARNING: Using mock Firebase due to configuration issues');
    firebaseInitialized = true;
    return {
      db: mockFirebase.db,
      admin: mockFirebase.admin,
      verifyToken: mockVerifyToken
    };

  } catch (error) {
    console.warn('WARNING: Using mock Firebase due to initialization error:', error.message);
    firebaseInitialized = true;
    return {
      db: mockFirebase.db,
      admin: mockFirebase.admin,
      verifyToken: mockVerifyToken
    };
  }
}

// This will be used when Firebase is properly initialized
async function verifyTokenFunction(token) {
  if (!adminInstance) {
    return mockVerifyToken(token);
  }
  try {
    const decodedToken = await adminInstance.auth().verifyIdToken(token);
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
