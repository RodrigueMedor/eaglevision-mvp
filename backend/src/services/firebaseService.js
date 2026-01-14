const { Timestamp, FieldValue } = require('firebase-admin/firestore');

// Use centralized Firebase initialization (env-based)
const firebase = require('../firebase');
firebase.initialize();
const db = firebase.db;

// Helper function to convert Firestore timestamps to ISO strings
const convertTimestamps = (doc) => {
  if (!doc) return null;
  
  const data = doc.data();
  if (!data) return null;
  
  const result = { id: doc.id, ...data };
  
  // Convert Firestore timestamps to ISO strings
  Object.keys(result).forEach(key => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate().toISOString();
    } else if (result[key] && typeof result[key] === 'object') {
      // Recursively convert nested objects
      result[key] = convertTimestamps({ data: () => result[key] });
    }
  });
  
  return result;
};

// Contacts Service
const contactsService = {
  collection: 'contacts',
  
  async getContacts({ filters = [], limit = 10, startAfter = null, orderBy = { field: 'createdAt', direction: 'desc' } } = {}) {
    try {
      let query = db.collection(this.collection);
      
      // Apply filters
      filters.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });
      
      // Apply ordering
      query = query.orderBy(orderBy.field, orderBy.direction);
      
      // Apply pagination
      if (startAfter) {
        const lastDoc = await db.collection(this.collection).doc(startAfter).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }
      
      // Execute query
      const snapshot = await query.limit(limit).get();
      
      // Get total count (for first page only)
      let totalCount = 0;
      if (!startAfter) {
        const countQuery = filters.reduce(
          (q, { field, operator, value }) => q.where(field, operator, value),
          db.collection(this.collection)
        );
        totalCount = (await countQuery.count().get()).data().count;
      }
      
      const data = [];
      snapshot.forEach(doc => {
        data.push(convertTimestamps(doc));
      });
      
      return {
        data,
        lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null,
        total: totalCount || data.length
      };
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  },
  
  async getContact(id) {
    try {
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return convertTimestamps(doc);
    } catch (error) {
      console.error(`Error getting contact ${id}:`, error);
      throw error;
    }
  },
  
  async createContact(data) {
    try {
      const docRef = await db.collection(this.collection).add({
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      const newDoc = await docRef.get();
      return convertTimestamps(newDoc);
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },
  
  async updateContactStatus(id, status) {
    try {
      await db.collection(this.collection).doc(id).update({
        status,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      return this.getContact(id);
    } catch (error) {
      console.error(`Error updating contact ${id} status:`, error);
      throw error;
    }
  },
  
  async deleteContact(id) {
    try {
      await db.collection(this.collection).doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting contact ${id}:`, error);
      throw error;
    }
  }
};

module.exports = {
  db,
  contactsService,
  Timestamp,
  FieldValue
};
