/**
 * Manager Routes
 * 
 * Protected routes for Managers
 * Version 1: Mostly stubbed
 */

const express = require('express');
const { verifyFirebaseToken, requireRole } = require('../authMiddleware');
const managerController = require('../controllers/managerController');

const router = express.Router();

// All routes require authentication and manager role
router.use(verifyFirebaseToken);
router.use(requireRole('manager'));

// GET /api/manager/kpis
router.get('/kpis', managerController.getKPIs);

// GET /api/manager/requests
router.get('/requests', managerController.listRequests);

// GET /api/manager/agents
router.get('/agents', managerController.listAgents);

// POST /api/manager/requests/:id/reassign
router.post('/requests/:id/reassign', managerController.reassignRequest);

// POST /api/manager/requests/:id/review
router.post('/requests/:id/review', managerController.reviewRequest);

// POST /api/manager/requests/:id/reopen
router.post('/requests/:id/reopen', managerController.reopenRequest);

// GET /api/manager/activity  (global activity feed)
router.get('/activity', managerController.getActivityLog);

// GET /api/manager/requests/:id/audit
router.get('/requests/:id/audit', managerController.getAuditLog);

module.exports = router;

