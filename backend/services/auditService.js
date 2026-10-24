const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function log({ userId, documentId, action, targetUserId, result, ipAddress, userAgent, metadata }) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (id, user_id, document_id, action, target_user_id, result, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), userId, documentId, action, targetUserId, result, ipAddress, userAgent, JSON.stringify(metadata || {})]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50, userId, documentId, action, result, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }
    if (documentId) {
      whereClause += ' AND document_id = ?';
      params.push(documentId);
    }
    if (action) {
      whereClause += ' AND action = ?';
      params.push(action);
    }
    if (result) {
      whereClause += ' AND result = ?';
      params.push(result);
    }
    if (startDate) {
      whereClause += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    const [rows] = await pool.execute(
      `SELECT al.*, u.name as user_name, u.email as user_email, d.name as document_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       LEFT JOIN documents d ON al.document_id = d.id
       ${whereClause}
       ORDER BY al.timestamp DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    
    res.json({
      logs: rows,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('Get audit logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { log, getAuditLogs };