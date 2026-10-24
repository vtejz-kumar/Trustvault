const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, requireRole('ADMIN'), auditController.getAuditLogs);

module.exports = router;