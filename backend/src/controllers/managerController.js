/**
 * Manager Controller
 * 
 * Handles HTTP requests for Manager endpoints
 * Version 1: Mostly stubbed, returns placeholder data
 * Version 2: Full implementation with KPIs, reassignment, audit logs
 */

const requestRepository = require('../repositories/requestRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const userRepository = require('../repositories/userRepository');
const requestService = require('../services/requestService');

/**
 * Get KPIs (Key Performance Indicators)
 * GET /api/manager/kpis
 * 
 * Version 1: Returns basic counts
 * Version 2: Add more sophisticated metrics
 */
async function getKPIs(req, res) {
  try {
    // Get all requests for KPI calculation
    const allRequests = await requestRepository.getAllRequests();

    // Calculate KPIs
    const kpis = {
      total: allRequests.length,
      open: allRequests.filter(r => r.status === 'OPEN').length,
      inProgress: allRequests.filter(r => r.status === 'IN_PROGRESS').length,
      submitted: allRequests.filter(r => r.status === 'SUBMITTED').length,
      approved: allRequests.filter(r => r.reviewStatus === 'APPROVED').length,
      rejected: allRequests.filter(r => r.reviewStatus === 'REJECTED').length,
      completed: allRequests.filter(r => r.status === 'COMPLETED').length,
      expired: allRequests.filter(r => r.status === 'EXPIRED').length
    };

    res.json({ kpis });
  } catch (error) {
    console.error('Error getting KPIs:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * List all requests with filters
 * GET /api/manager/requests
 * 
 * Version 1: Basic filtering
 * Version 2: Advanced filters, pagination
 */
async function listRequests(req, res) {
  try {
    const { agentId, status, startDate, endDate } = req.query;

    const filters = {};
    if (agentId) filters.agentId = agentId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const requests = await requestRepository.getAllRequests(filters);

    res.json({ requests });
  } catch (error) {
    console.error('Error listing requests:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

/**
 * Reassign request to another agent
 * POST /api/manager/requests/:id/reassign
 * 
 * Version 1: Stub
 * Version 2: Full implementation
 */
async function reassignRequest(req, res) {
  try {
    const { id } = req.params;
    const { newAgentId } = req.body;
    const managerId = req.user.uid;
    const actorIp = req.ip || req.connection.remoteAddress;

    if (!newAgentId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'newAgentId is required'
      });
    }

    // Verify request exists
    const request = await requestRepository.getRequestById(id);
    if (!request) {
      return res.status(404).json({ error: 'Not Found', message: 'Request not found' });
    }

    // Verify new agent exists and is actually an agent
    const newAgent = await userRepository.getUserById(newAgentId);
    if (!newAgent || newAgent.role !== 'agent') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid agent' });
    }

    const oldAgentId = request.agentId;

    await requestRepository.updateRequest(id, { agentId: newAgentId });

    await auditLogRepository.createAuditLog({
      actorId: managerId,
      action: 'REQUEST_REASSIGNED',
      requestId: id,
      ip: actorIp,
      metadata: { oldAgentId, newAgentId, newAgentName: newAgent.name }
    });

    const updatedRequest = await requestRepository.getRequestById(id);
    res.json({ message: 'Request reassigned successfully', request: updatedRequest });
  } catch (error) {
    console.error('Error reassigning request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

/**
 * List all agents
 * GET /api/manager/agents
 */
async function listAgents(req, res) {
  try {
    const agents = await userRepository.getUsersByRole('agent');
    res.json({ agents: agents.map(a => ({ id: a.id, name: a.name, email: a.email })) });
  } catch (error) {
    console.error('Error listing agents:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

/**
 * Review request (Approve or Reject) — same logic as Tele-Sales but for managers
 * POST /api/manager/requests/:id/review
 */
async function reviewRequest(req, res) {
  try {
    const { id } = req.params;
    const { decision, comment, rejectedDocumentTypes } = req.body;
    const managerId = req.user.uid;
    const actorIp = req.ip || req.connection.remoteAddress;

    if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'Bad Request', message: 'decision must be APPROVE or REJECT' });
    }
    if (decision === 'REJECT' && (!rejectedDocumentTypes || rejectedDocumentTypes.length === 0)) {
      return res.status(400).json({ error: 'Bad Request', message: 'At least one document must be selected for the customer to re-upload' });
    }

    const updatedRequest = await requestService.reviewRequest(id, decision, comment, managerId, actorIp, rejectedDocumentTypes || []);
    res.json({ message: 'Request reviewed successfully', request: updatedRequest });
  } catch (error) {
    console.error('Error reviewing request:', error);
    res.status(400).json({ error: 'Bad Request', message: error.message });
  }
}

/**
 * Reopen expired request (same as Tele-Sales)
 * POST /api/manager/requests/:id/reopen
 */
async function reopenRequest(req, res) {
  try {
    const { id } = req.params;
    const managerId = req.user.uid;
    const actorIp = req.ip || req.connection.remoteAddress;

    const updatedRequest = await requestService.reopenRequest(id, managerId, actorIp);

    res.json({
      message: 'Request reopened successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error reopening request:', error);
    res.status(400).json({ 
      error: 'Bad Request', 
      message: error.message 
    });
  }
}

/**
 * Get audit log for a request
 * GET /api/manager/requests/:id/audit
 */
async function getAuditLog(req, res) {
  try {
    const { id } = req.params;

    // Verify request exists
    const request = await requestRepository.getRequestById(id);
    if (!request) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Request not found' 
      });
    }

    const auditLogs = await auditLogRepository.getAuditLogsByRequestId(id);

    res.json({ auditLogs });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error.message 
    });
  }
}

module.exports = {
  getKPIs,
  listRequests,
  listAgents,
  reassignRequest,
  reviewRequest,
  reopenRequest,
  getAuditLog
};

