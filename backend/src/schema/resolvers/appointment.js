const { AuthenticationError, UserInputError } = require('../../errors');
const { Timestamp } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');
const { sendSSOEmail } = require('../../services/email');
const { createDocusignEnvelope } = require('../../services/docusign');
const { logAudit } = require('../../utils/audit');

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
          .where('status', 'not-in', ['CANCELLED', 'DECLINED'])
          .get();

        if (!existingAppointments.empty) {
          throw new UserInputError('This time slot is already booked');
        }

        // Generate a unique ID for the appointment
        const appointmentId = uuidv4();
        const ssoToken = uuidv4();

        const appointmentData = {
          id: appointmentId,
          userId: user ? user.uid : null,
          service: input.service,
          appointmentDate: Timestamp.fromDate(appointmentDate),
          status: 'PENDING_SSO', // Initial status, will change after SSO verification
          notes: input.notes || '',
          documentSigned: false,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          ssoToken,
          ssoVerified: false,
          auditLog: [{
            timestamp: Timestamp.now(),
            action: 'APPOINTMENT_CREATED',
            status: 'PENDING_SSO',
            message: 'Appointment created, waiting for SSO verification'
          }],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Create appointment in Firestore
        const appointmentRef = db.collection('appointments').doc(appointmentId);
        
        // Use a transaction to ensure data consistency
        await db.runTransaction(async (transaction) => {
          transaction.set(appointmentRef, appointmentData);
          
          // Send SSO verification email
          try {
            await sendSSOEmail({
              to: input.email,
              token: ssoToken,
              appointmentId,
              firstName: input.firstName,
              lastName: input.lastName,
              service: input.service,
              appointmentDate: appointmentDate.toLocaleString()
            });

            // Log the SSO initiation
            transaction.update(appointmentRef, {
              auditLog: [
                ...appointmentData.auditLog,
                {
                  timestamp: Timestamp.now(),
                  action: 'SSO_EMAIL_SENT',
                  status: 'PENDING',
                  message: 'SSO verification email sent'
                }
              ]
            });
          } catch (emailError) {
            console.error('Failed to send SSO email:', emailError);
            
            // Log the failure but don't fail the appointment creation
            transaction.update(appointmentRef, {
              auditLog: [
                ...appointmentData.auditLog,
                {
                  timestamp: Timestamp.now(),
                  action: 'SSO_EMAIL_FAILED',
                  status: 'ERROR',
                  message: 'Failed to send SSO verification email',
                  error: emailError.message
                }
              ]
            });
            
            throw new Error('Appointment created but failed to send verification email. Please contact support.');
          }
        });
        
        // Return the appointment data without sensitive information
        const { ssoToken: _, auditLog, ...responseData } = appointmentData;
        
        return {
          ...responseData,
          id: appointmentId,
          appointmentDate: responseData.appointmentDate.toDate().toISOString(),
          createdAt: responseData.createdAt.toDate().toISOString(),
          updatedAt: responseData.updatedAt.toDate().toISOString(),
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
  },
  
  async resendSSO(_, { appointmentId }, { db, user }) {
    if (!user) {
      throw new AuthenticationError('You must be logged in to resend verification');
    }
    
    const appointmentRef = db.collection('appointments').doc(appointmentId);
    const doc = await appointmentRef.get();
    
    if (!doc.exists) {
      throw new UserInputError('Appointment not found');
    }
    
    const appointment = doc.data();
    
    // Verify the user has permission
    if (appointment.userId !== user.uid) {
      throw new AuthenticationError('Not authorized to resend verification for this appointment');
    }
    
    // Generate a new token
    const newToken = uuidv4();
    const updateData = {
      ssoToken: newToken,
      updatedAt: Timestamp.now(),
      auditLog: [
        ...(appointment.auditLog || []),
        {
          timestamp: Timestamp.now(),
          action: 'SSO_EMAIL_RESENT',
          status: 'PENDING',
          message: 'SSO verification email resent'
        }
      ]
    };
    
    try {
      // Update the appointment with the new token
      await appointmentRef.update(updateData);
      
      // Resend the email
      await sendSSOEmail({
        to: appointment.email,
        token: newToken,
        appointmentId,
        firstName: appointment.firstName,
        lastName: appointment.lastName,
        service: appointment.service,
        appointmentDate: appointment.appointmentDate.toDate().toLocaleString()
      });
      
      return true;
    } catch (error) {
      console.error('Error resending SSO email:', error);
      
      // Log the error
      await logAudit(db, appointmentId, {
        action: 'SSO_EMAIL_RESEND_FAILED',
        status: 'ERROR',
        message: 'Failed to resend SSO verification email',
        error: error.message
  },
  Appointment: {
    // Resolve any custom fields or relationships for the Appointment type
    id: (parent) => parent.id || parent._id,
    appointmentDate: (parent) => {
      if (parent.appointmentDate && typeof parent.appointmentDate.toDate === 'function') {
        return parent.appointmentDate.toDate().toISOString();
      }
      return parent.appointmentDate;
    },
    createdAt: (parent) => {
      if (parent.createdAt && typeof parent.createdAt.toDate === 'function') {
        return parent.createdAt.toDate().toISOString();
      }
      return parent.createdAt;
    },
    updatedAt: (parent) => {
      if (parent.updatedAt && typeof parent.updatedAt.toDate === 'function') {
        return parent.updatedAt.toDate().toISOString();
      }
      return parent.updatedAt;
    },
    ssoVerifiedAt: (parent) => {
      if (parent.ssoVerifiedAt && typeof parent.ssoVerifiedAt.toDate === 'function') {
        return parent.ssoVerifiedAt.toDate().toISOString();
      }
      return parent.ssoVerifiedAt || null;
    },
    auditLog: (parent) => {
      if (!parent.auditLog) return [];
      return parent.auditLog.map(log => ({
        ...log,
        timestamp: log.timestamp && typeof log.timestamp.toDate === 'function' 
          ? log.timestamp.toDate().toISOString() 
          : log.timestamp
      }));
    }
  },
  AuditLogEntry: {
    timestamp: (parent) => {
      if (parent.timestamp && typeof parent.timestamp.toDate === 'function') {
        return parent.timestamp.toDate().toISOString();
      }
      return parent.timestamp;
    }
  },
};

module.exports = appointmentResolvers;
