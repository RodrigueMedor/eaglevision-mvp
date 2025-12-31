const { AuthenticationError, UserInputError } = require('../../errors');
const { Timestamp } = require('firebase-admin/firestore');

const userResolvers = {
  Query: {
    async me(_, __, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in');
        }

        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
          throw new UserInputError('User not found');
        }

        const data = userDoc.data();
        
        return {
          id: userDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    },

    async user(_, { id }, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in');
        }

        // Only allow admins to fetch other users
        if (user.uid !== id && user.role !== 'ADMIN') {
          throw new AuthenticationError('Not authorized');
        }

        const userDoc = await db.collection('users').doc(id).get();
        
        if (!userDoc.exists) {
          throw new UserInputError('User not found');
        }

        const data = userDoc.data();
        
        return {
          id: userDoc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    },
  },

  Mutation: {
    async updateUser(_, { input }, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in to update your profile');
        }

        const updateData = {
          ...input,
          updatedAt: Timestamp.now(),
        };

        await db.collection('users').doc(user.uid).update(updateData);

        const updatedDoc = await db.collection('users').doc(user.uid).get();
        const updatedData = updatedDoc.data();

        return {
          id: updatedDoc.id,
          ...updatedData,
          createdAt: updatedData.createdAt?.toDate().toISOString() || new Date().toISOString(),
          updatedAt: updatedData.updatedAt?.toDate().toISOString() || new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    },
  },
};

module.exports = userResolvers;
