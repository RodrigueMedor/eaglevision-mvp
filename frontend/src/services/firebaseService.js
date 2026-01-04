import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  serverTimestamp,
  setDoc,
  Timestamp
} from 'firebase/firestore';

// Generic CRUD operations
const getCollection = (collectionName) => collection(db, collectionName);

export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

export const getDocuments = async (collectionName, conditions = []) => {
  try {
    let q = query(getCollection(collectionName));
    
    // Add conditions to the query
    conditions.forEach(condition => {
      q = query(q, where(condition.field, condition.operator, condition.value));
    });
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
};

export const addDocument = async (collectionName, data) => {
  try {
    console.log(`[Firebase] [${new Date().toISOString()}] Attempting to add document to collection: ${collectionName}`);
    
    // Validate input
    if (!collectionName || typeof collectionName !== 'string') {
      throw new Error(`Invalid collection name: ${collectionName}`);
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid document data');
    }
    
    const collectionRef = collection(db, collectionName);
    
    // Clean up the data object first
    const cleanData = { ...data };
    
    // Handle date fields
    if (cleanData.date) {
      try {
        cleanData.date = cleanData.date instanceof Date ? 
          cleanData.date : 
          new Date(cleanData.date);
      } catch (e) {
        console.warn('[Firebase] Failed to parse date, using current date', e);
        cleanData.date = new Date();
      }
    }
    
    // Add timestamps - these will be set by the server
    cleanData.createdAt = serverTimestamp();
    cleanData.updatedAt = serverTimestamp();
    
    // Ensure status is set for appointments
    if (collectionName === 'appointments' && !cleanData.status) {
      cleanData.status = 'pending';
    }
    
    // Log the data we're about to send
    console.log('[Firebase] Document data with timestamps:', {
      ...cleanData,
      // Don't log the entire date object to avoid circular references
      ...(cleanData.date && { date: cleanData.date.toString() }),
      createdAt: '[Server Timestamp]',
      updatedAt: '[Server Timestamp]'
    });
    
    console.log('[Firebase] Attempting to add document to Firestore...');
    const docRef = await addDoc(collectionRef, cleanData);
    console.log(`[Firebase] [${new Date().toISOString()}] Document created with ID: ${docRef.id}`);
    
    // Return the document data with the new ID
    return { 
      id: docRef.id, 
      ...cleanData,
      // Replace server timestamps with client-side timestamps for the response
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    // Create error info object
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      code: error.code,
      message: error.message,
      collectionName,
      // Add Firebase app check if available
      ...(window.FIREBASE_APPCHECK_DEBUG_TOKEN && { debugToken: window.FIREBASE_APPCHECK_DEBUG_TOKEN }),
      data: JSON.stringify(data, (key, value) => {
        // Handle circular references in error logging
        if (value instanceof Error) {
          return {
            message: value.message,
            stack: value.stack,
            ...value
          };
        }
        return value;
      }, 2)
    };
    
    console.error('[Firebase] Error adding document:', errorInfo);
    
    // Add more context to the error
    const enhancedError = new Error(`Failed to add document to ${collectionName}: ${error.message}`);
    enhancedError.code = error.code || 'unknown';
    enhancedError.details = errorInfo;
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { id: docId, ...data };
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Test Firestore connection
export const testFirestoreConnection = async () => {
  try {
    console.log('[Firebase] Testing Firestore connection...');
    const testDocRef = doc(db, '_test', 'connection-test');
    const testData = {
      timestamp: serverTimestamp(),
      message: 'Test connection',
      success: true
    };
    
    console.log('[Firebase] Writing test document...');
    await setDoc(testDocRef, testData);
    console.log('[Firebase] Test document written successfully');
    
    console.log('[Firebase] Reading test document...');
    const docSnap = await getDoc(testDocRef);
    console.log('[Firebase] Test document data:', docSnap.data());
    
    return { success: true, data: docSnap.data() };
  } catch (error) {
    console.error('[Firebase] Test connection failed:', {
      error: error.toString(),
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return { success: false, error };
  }
};

// Specific collection services
export const appointmentsService = {
  collection: 'appointments',
  
  async getAppointments(userId) {
    return getDocuments(this.collection, [
      { field: 'userId', operator: '==', value: userId }
    ]);
  },
  
  async getAppointmentsByDateRange(startDate, endDate) {
    try {
      // Convert string dates to Date objects if they're not already
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Query for appointments within the date range
      return await getDocuments(this.collection, [
        { field: 'date', operator: '>=', value: start },
        { field: 'date', operator: '<=', value: end }
      ]);
    } catch (error) {
      console.error('Error getting appointments by date range:', error);
      return [];
    }
  },
  
  async getAppointment(id) {
    return getDocument(this.collection, id);
  },
  
  async createAppointment(data) {
    // Format the data to match our security rules
    const appointmentData = {
      // User information
      firstName: String(data.firstName || ''),
      lastName: String(data.lastName || ''),
      email: String(data.email || ''),
      phone: String(data.phone || ''),
      
      // Appointment details
      service: String(data.service || ''),
      time: String(data.time || ''),
      notes: String(data.notes || ''),
      
      // Handle date - ensure it's a proper Date object
      date: data.date ? (data.date instanceof Date ? data.date : new Date(data.date)) : new Date(),
      
      // System fields
      status: String(data.status || 'pending'),
      userId: data.userId || 'guest',
      
      // Additional display fields (not used in security rules)
      ...(data.appointmentDate && { appointmentDate: data.appointmentDate }),
      ...(data.time24 && { time24: data.time24 }),
      ...(data.displayDate && { displayDate: data.displayDate }),
      ...(data.displayTime && { displayTime: data.displayTime }),
      ...(data.serviceLabel && { serviceLabel: data.serviceLabel }),
      
      // Guest user information if applicable
      ...(data.userId === 'guest' && {
        userInfo: {
          name: String(data.userInfo?.name || `${data.firstName} ${data.lastName}`.trim() || ''),
          email: String(data.userInfo?.email || data.email || ''),
          phone: String(data.userInfo?.phone || data.phone || '')
        }
      })
    };
    
    // Remove any undefined or null values that might cause Firestore validation to fail
    Object.keys(appointmentData).forEach(key => {
      if (appointmentData[key] === undefined || appointmentData[key] === null) {
        delete appointmentData[key];
      }
    });

    return addDocument(this.collection, appointmentData);
  },
  
  async updateAppointment(id, data) {
    return updateDocument(this.collection, id, data);
  },
  
  async deleteAppointment(id) {
    return deleteDocument(this.collection, id);
  }
};

// Test Firestore write access
export const testFirestoreWrite = async () => {
  try {
    const testData = {
      test: 'This is a test document',
      timestamp: serverTimestamp(),
      testDate: new Date().toISOString()
    };
    
    console.log('[Firebase] Testing Firestore write access...');
    const docRef = await addDoc(collection(db, 'test_collection'), testData);
    console.log('[Firebase] Test document written with ID:', docRef.id);
    
    // Clean up
    await deleteDoc(doc(db, 'test_collection', docRef.id));
    console.log('[Firebase] Test document cleaned up');
    
    return { success: true, docId: docRef.id };
  } catch (error) {
    console.error('[Firebase] Test write failed:', {
      error: error.toString(),
      code: error.code,
      message: error.message,
      ...(window.FIREBASE_APPCHECK_DEBUG_TOKEN && { debugToken: window.FIREBASE_APPCHECK_DEBUG_TOKEN })
    });
    return { success: false, error };
  }
};

// Contacts service
export const contactsService = {
  collection: 'contacts',
  
  async createContact(data) {
    try {
      console.log('Creating contact:', data);
      const docRef = await addDocument(this.collection, {
        ...data,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Contact created with ID:', docRef.id);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },
  
  async getContacts() {
    try {
      const contacts = await getDocuments(this.collection);
      return contacts;
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  },
  
  async updateContactStatus(contactId, status) {
    try {
      await updateDocument(this.collection, contactId, {
        status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating contact status:', error);
      throw error;
    }
  }
};

// Users service
export const usersService = {
  collection: 'users',
  
  async getUserProfile(uid) {
    return getDocument(this.collection, uid);
  },
  
  async updateUserProfile(uid, data) {
    return updateDocument(this.collection, uid, data);
  }
};

// Example of how to use:
/*
import { appointmentsService } from './services/firebaseService';

// Get all appointments for current user
const myAppointments = await appointmentsService.getAppointments(currentUser.uid);

// Create a new appointment
const newAppointment = await appointmentsService.createAppointment({
  userId: currentUser.uid,
  title: 'Tax Consultation',
  date: '2025-12-31',
  time: '14:00',
  status: 'scheduled'
});
*/
