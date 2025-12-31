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
  orderBy,
  serverTimestamp
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
    console.log(`[Firebase] Attempting to add document to collection: ${collectionName}`);
    console.log('[Firebase] Document data:', JSON.stringify(data, null, 2));
    
    // Validate input
    if (!collectionName || typeof collectionName !== 'string') {
      throw new Error(`Invalid collection name: ${collectionName}`);
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid document data');
    }
    
    const collectionRef = getCollection(collectionName);
    console.log('[Firebase] Collection reference:', collectionRef);
    
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('[Firebase] Document data with timestamps:', JSON.stringify(docData, null, 2));
    
    const docRef = await addDoc(collectionRef, docData);
    console.log('[Firebase] Document created with ID:', docRef.id);
    
    return { id: docRef.id, ...data };
  } catch (error) {
    console.error('[Firebase] Error adding document:', {
      error: error.toString(),
      code: error.code,
      message: error.message,
      stack: error.stack,
      collectionName,
      data: JSON.stringify(data, null, 2)
    });
    
    // Add more context to the error
    const enhancedError = new Error(`Failed to add document to ${collectionName}: ${error.message}`);
    enhancedError.code = error.code || 'unknown';
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

// Specific collection services
export const appointmentsService = {
  collection: 'appointments',
  
  async getAppointments(userId) {
    return getDocuments(this.collection, [
      { field: 'userId', operator: '==', value: userId }
    ]);
  },
  
  async getAppointment(id) {
    return getDocument(this.collection, id);
  },
  
  async createAppointment(data) {
    return addDocument(this.collection, data);
  },
  
  async updateAppointment(id, data) {
    return updateDocument(this.collection, id, data);
  },
  
  async deleteAppointment(id) {
    return deleteDocument(this.collection, id);
  }
};

// Add more collection services as needed
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
