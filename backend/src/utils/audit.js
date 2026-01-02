const { Timestamp } = require('firebase-admin/firestore');

/**
 * Logs an audit entry for an appointment
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} appointmentId - ID of the appointment
 * @param {Object} entry - Audit log entry
 * @param {string} entry.action - The action being logged
 * @param {string} entry.status - Status of the action (e.g., 'PENDING', 'COMPLETED', 'ERROR')
 * @param {string} [entry.message] - Optional message
 * @param {Object} [entry.metadata] - Additional metadata
 * @returns {Promise<void>}
 */
const logAudit = async (db, appointmentId, { action, status, message, metadata, error }) => {
  const logEntry = {
    timestamp: Timestamp.now(),
    action,
    status,
    ...(message && { message }),
    ...(metadata && { metadata }),
    ...(error && { error: error.message || String(error) })
  };

  const appointmentRef = db.collection('appointments').doc(appointmentId);
  await appointmentRef.update({
    auditLog: admin.firestore.FieldValue.arrayUnion(logEntry),
    updatedAt: Timestamp.now()
  });
};

module.exports = { logAudit };
