const auditService = require('../services/auditService');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

async function getAuditLogs(req, res) {
  await auditService.getAuditLogs(req, res);
}

module.exports = { getAuditLogs };