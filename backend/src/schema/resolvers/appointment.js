const { AuthenticationError, UserInputError } = require('../../errors');
const { Timestamp } = require('firebase-admin/firestore');

const appointmentResolvers = {
  Query: {
    async appointments(_, __, { db }) {
      try {
        console.log('Starting appointments query');
        
        try {
          // Test the database connection
          const testDoc = await db.collection('test').doc('test').get();
          console.log('Firestore connection test successful');
        } catch (dbError) {
          console.error('Firestore connection error:', dbError);
          throw new Error('Failed to connect to the database');
        }

        console.log('Fetching appointments from Firestore...');
        const appointmentsSnapshot = await db
          .collection('appointments')
          .orderBy('appointmentDate', 'desc')
          .get();

        console.log(`Found ${appointmentsSnapshot.size} appointments`);
        
        const appointments = [];
        for (const doc of appointmentsSnapshot.docs) {
          try {
            const data = doc.data();
            appointments.push({
              id: doc.id,
              ...data,
              appointmentDate: data.appointmentDate ? data.appointmentDate.toDate().toISOString() : null,
              createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
              updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
            });
          } catch (docError) {
            console.error(`Error processing document ${doc.id}:`, docError);
            // Continue with other documents even if one fails
          }
        }

        return appointments;
      } catch (error) {
        console.error('Error in appointments resolver:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          details: error.details
        });
        throw new Error(`Failed to fetch appointments: ${error.message}`);
      }
    },
    
    async userAppointments(_, { userId }, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in to view appointments');
        }

        const appointmentsSnapshot = await db
          .collection('appointments')
          .where('userId', '==', userId)
          .orderBy('appointmentDate', 'desc')
          .get();

        return appointmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          appointmentDate: doc.data().appointmentDate.toDate().toISOString(),
          createdAt: doc.data().createdAt.toDate().toISOString(),
          updatedAt: doc.data().updatedAt.toDate().toISOString(),
        }));
      } catch (error) {
        console.error('Error fetching appointments:', error);
        throw new Error('Failed to fetch appointments');
      }
    },

    async appointment(_, { id }, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in to view this appointment');
        }

        const doc = await db.collection('appointments').doc(id).get();
        
        if (!doc.exists) {
          throw new UserInputError('Appointment not found');
        }

        const data = doc.data();
        
        // Verify the user has permission to view this appointment
        if (data.userId !== user.uid) {
          throw new AuthenticationError('Not authorized to view this appointment');
        }

        return {
          id: doc.id,
          ...data,
          appointmentDate: data.appointmentDate.toDate().toISOString(),
          createdAt: data.createdAt.toDate().toISOString(),
          updatedAt: data.updatedAt.toDate().toISOString(),
        };
      } catch (error) {
        console.error('Error fetching appointment:', error);
        throw error;
      }
    },
  },

  Mutation: {
    async createAppointment(_, { input }, { db, user }) {
      try {
        // Validate required fields
        const requiredFields = ['service', 'appointmentDate', 'firstName', 'lastName', 'email', 'phone'];
        const missingFields = requiredFields.filter(field => !input[field]);
        
        if (missingFields.length > 0) {
          throw new UserInputError('Missing required fields', {
            missingFields,
            message: `The following fields are required: ${missingFields.join(', ')}`
          });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.email)) {
          throw new UserInputError('Invalid email format');
        }

        // Generate a unique ID for unauthenticated users
        const generateGuestId = () => {
          return 'guest_' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
        };
        
        const userId = user ? user.uid : generateGuestId();

        const appointmentDate = new Date(input.appointmentDate);
        const now = new Date();

        // Validate appointment date is in the future
        if (appointmentDate <= now) {
          throw new UserInputError('Appointment date must be in the future');
        }

        // Check for existing appointments at the same time
        const existingAppointments = await db
          .collection('appointments')
          .where('appointmentDate', '==', Timestamp.fromDate(appointmentDate))
          .get();

        if (!existingAppointments.empty) {
          throw new UserInputError('This time slot is already booked');
        }

        const appointmentData = {
          userId: userId,
          service: input.service,
          appointmentDate: Timestamp.fromDate(appointmentDate),
          status: 'PENDING',
          notes: input.notes || '',
          documentSigned: false,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const docRef = await db.collection('appointments').add(appointmentData);
        
        return {
          id: docRef.id,
          ...appointmentData,
          appointmentDate: appointmentData.appointmentDate.toDate().toISOString(),
          createdAt: appointmentData.createdAt.toDate().toISOString(),
          updatedAt: appointmentData.updatedAt.toDate().toISOString(),
        };
      } catch (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }
    },

    async updateAppointment(_, { input }, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in to update an appointment');
        }

        const docRef = db.collection('appointments').doc(input.id);
        const doc = await docRef.get();

        if (!doc.exists) {
          throw new UserInputError('Appointment not found');
        }

        const data = doc.data();

        // Verify the user has permission to update this appointment
        if (data.userId !== user.uid) {
          throw new AuthenticationError('Not authorized to update this appointment');
        }

        const updateData = {
          ...input,
          updatedAt: Timestamp.now(),
        };

        // Remove the ID from the update data
        delete updateData.id;

        // Convert date strings to Firestore Timestamp if needed
        if (updateData.appointmentDate) {
          updateData.appointmentDate = Timestamp.fromDate(new Date(updateData.appointmentDate));
        }

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data();

        return {
          id: doc.id,
          ...updatedData,
          appointmentDate: updatedData.appointmentDate.toDate().toISOString(),
          createdAt: updatedData.createdAt.toDate().toISOString(),
          updatedAt: updatedData.updatedAt.toDate().toISOString(),
        };
      } catch (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }
    },

    async deleteAppointment(_, { id }, { db, user }) {
      try {
        if (!user) {
          throw new AuthenticationError('You must be logged in to delete an appointment');
        }

        const docRef = db.collection('appointments').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
          throw new UserInputError('Appointment not found');
        }

        const data = doc.data();

        // Verify the user has permission to delete this appointment
        if (data.userId !== user.uid) {
          throw new AuthenticationError('Not authorized to delete this appointment');
        }

        await docRef.delete();
        return true;
      } catch (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }
    },
  },
};

module.exports = appointmentResolvers;
