/**
 * Audit Log Repository
 * 
 * Handles all Firestore operations for the 'auditLogs' collection
 * 
 * Audit logs track all important actions in the system for compliance and debugging
 */

const { db } = require('../firebase');

/**
 * Create a new audit log entry
 */
async function createAuditLog(logData) {
  const logRef = db.collection('auditLogs').doc();
  const logId = logRef.id;
  
  await logRef.set({
    id: logId,
    actorId: logData.actorId, // User ID or 'system'
    action: logData.action,   // e.g., 'REQUEST_CREATED', 'CUSTOMER_SUBMITTED'
    requestId: logData.requestId,
    timestamp: new Date(),
    ip: logData.ip || null,
    metadata: logData.metadata || {} // Additional context
  });
  
  return {
    id: logId,
    ...logData,
    timestamp: new Date()
  };
}

/**
 * Get all audit logs for a specific request
 */
async function getAuditLogsByRequestId(requestId) {
  const snapshot = await db.collection('auditLogs')
    .where('requestId', '==', requestId)
    .get();

  const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  logs.sort((a, b) => {
    const ta = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
    const tb = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
    return tb - ta;
  });
  return logs;
}

/**
 * Get recent audit logs across all requests (global activity feed)
 */
async function getAllAuditLogs(limit = 100) {
  const snapshot = await db.collection('auditLogs')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get audit logs by actor (user)
 */
async function getAuditLogsByActorId(actorId) {
  const snapshot = await db.collection('auditLogs')
    .where('actorId', '==', actorId)
    .orderBy('timestamp', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

module.exports = {
  createAuditLog,
  getAuditLogsByRequestId,
  getAuditLogsByActorId,
  getAllAuditLogs
};

