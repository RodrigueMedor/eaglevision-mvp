const { AuthenticationError, UserInputError } = require('../../errors');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../../utils/audit');

const appointmentResolvers = {
  Query: {
    async appointments(_, __, { db }) {
      try {
        const snapshot = await db
          .collection('appointments')
          .orderBy('appointmentDate', 'desc')
          .get();

        return snapshot.docs.map(doc => normalizeAppointment(doc));
      } catch (err) {
        console.error('Error fetching appointments list:', err);
        // Non-nullable list: return empty array on error
        return [];
      }
    },

    async userAppointments(_, { userId }, { db, user }) {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      if (user.uid !== userId) {
        throw new AuthenticationError('Unauthorized');
      }

      const snapshot = await db
          .collection('appointments')
          .where('userId', '==', userId)
          .orderBy('appointmentDate', 'desc')
          .get();

      return snapshot.docs.map(doc => normalizeAppointment(doc));
    },

    async appointment(_, { id }, { db, user, isMockDb }) {
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      if (isMockDb) {
        // Mock database implementation
        const appointment = db.collections.appointments?.[id];
        if (!appointment) {
          throw new UserInputError('Appointment not found');
        }
        
        if (appointment.userId !== user.uid) {
          throw new AuthenticationError('Unauthorized');
        }
        
        return { id, ...appointment };
      } else {
        // Real Firebase implementation
        const doc = await db.collection('appointments').doc(id).get();
        if (!doc.exists) {
          throw new UserInputError('Appointment not found');
        }

        const data = doc.data();
        if (data.userId !== user.uid) {
          throw new AuthenticationError('Unauthorized');
        }

        return normalizeAppointment(doc);
      }
    }
  },

  Mutation: {
    async createAppointment(_, { input }, { db, user }) {
      // Require authentication for creating appointments
      if (!user) {
        throw new AuthenticationError('You must be logged in to create an appointment');
      }

      const required = ['service', 'appointmentDate'];
      const missing = required.filter(field => !input[field]);
      
      if (missing.length) {
        throw new UserInputError(`Missing required fields: ${missing.join(', ')}`);
      }

      const appointmentDate = new Date(input.appointmentDate);
      if (appointmentDate <= new Date()) {
        throw new UserInputError('Appointment must be in the future');
      }

      // Prevent double booking
      const snapshot = await db
        .collection('appointments')
        .where('appointmentDate', '==', Timestamp.fromDate(appointmentDate))
        .get();

      const activeAppointments = snapshot.docs.filter(
        doc => !['CANCELLED', 'DECLINED'].includes(doc.data().status)
      );

      if (activeAppointments.length > 0) {
        throw new UserInputError('Time slot already booked');
      }

      const appointmentId = uuidv4();
      const ssoToken = uuidv4();
      const ref = db.collection('appointments').doc(appointmentId);

      // Get user details from the database
      const userDoc = await db.collection('users').doc(user.id).get();
      if (!userDoc.exists) {
        throw new AuthenticationError('User not found');
      }
      const userData = userDoc.data();

      const appointmentData = {
        id: appointmentId,
        userId: user.id,
        user: {
          id: user.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone
        },
        service: input.service,
        appointmentDate: Timestamp.fromDate(appointmentDate),
        status: 'PENDING_SSO',
        notes: input.notes || '',
        documentSigned: false,
        firstName: userData.firstName || input.firstName || '',
        lastName: userData.lastName || input.lastName || '',
        email: userData.email || input.email || '',
        phone: userData.phone || input.phone || '',
        ssoToken,
        ssoVerified: false,
        auditLog: [
          {
            timestamp: Timestamp.now(),
            action: 'APPOINTMENT_CREATED',
            status: 'PENDING_SSO',
            message: 'Appointment created, waiting for SSO verification',
            userId: user.id,
            userEmail: userData.email
          }
        ],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await ref.set(appointmentData);

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

        await ref.update({
          auditLog: FieldValue.arrayUnion({
            timestamp: Timestamp.now(),
            action: 'SSO_EMAIL_SENT',
            status: 'PENDING',
            message: 'SSO email sent'
          }),
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        await logAudit(db, appointmentId, {
          action: 'SSO_EMAIL_FAILED',
          status: 'ERROR',
          message: err.message
        });
        throw new Error('Appointment created but email failed');
      }

      return normalizeAppointment(await ref.get());
    },

    async updateAppointment(_, { input }, { db, user }) {
      if (!user) throw new AuthenticationError('Authentication required');

      const ref = db.collection('appointments').doc(input.id);
      const doc = await ref.get();
      if (!doc.exists) throw new UserInputError('Appointment not found');

      if (doc.data().userId !== user.uid) {
        throw new AuthenticationError('Unauthorized');
      }

      const update = { ...input };
      delete update.id;

      if (update.appointmentDate) {
        update.appointmentDate = Timestamp.fromDate(new Date(update.appointmentDate));
      }

      update.updatedAt = Timestamp.now();

      await ref.update(update);
      return normalizeAppointment(await ref.get());
    },

    async deleteAppointment(_, { id }, { db, user }) {
      if (!user) throw new AuthenticationError('Authentication required');

      const ref = db.collection('appointments').doc(id);
      const doc = await ref.get();
      if (!doc.exists) throw new UserInputError('Appointment not found');

      if (doc.data().userId !== user.uid) {
        throw new AuthenticationError('Unauthorized');
      }

      await ref.delete();
      return { id, success: true };
    },

    async resendSSO(_, { appointmentId }, { db, user }) {
      if (!user) throw new AuthenticationError('Authentication required');

      const ref = db.collection('appointments').doc(appointmentId);
      const doc = await ref.get();
      if (!doc.exists) throw new UserInputError('Appointment not found');

      const data = doc.data();
      if (data.userId !== user.uid) {
        throw new AuthenticationError('Unauthorized');
      }

      const newToken = uuidv4();

      await ref.update({
        ssoToken: newToken,
        updatedAt: Timestamp.now(),
        auditLog: FieldValue.arrayUnion({
          timestamp: Timestamp.now(),
          action: 'SSO_EMAIL_RESENT',
          status: 'PENDING',
          message: 'SSO email resent'
        })
      });

      await sendSSOEmail({
        to: data.email,
        token: newToken,
        appointmentId,
        firstName: data.firstName,
        lastName: data.lastName,
        service: data.service,
        appointmentDate: data.appointmentDate.toDate().toLocaleString()
      });

      return true;
    }
  },

  Appointment: {
    appointmentDate: p => toISO(p.appointmentDate),
    createdAt: p => toISO(p.createdAt),
    updatedAt: p => toISO(p.updatedAt),
    auditLog: p =>
        (p.auditLog || []).map(l => ({
          ...l,
          timestamp: toISO(l.timestamp)
        }))
  }
};

/* ---------------- HELPERS ---------------- */

function toISO(value) {
  return value?.toDate?.()?.toISOString() ?? null;
}

function normalizeAppointment(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    appointmentDate: toISO(data.appointmentDate),
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt)
  };
}

module.exports = appointmentResolvers;