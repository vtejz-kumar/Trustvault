const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const documentService = require('./documentService');
const auditService = require('./auditService');

async function grantPermission(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { targetUserId, permission } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  if (!targetUserId || !permission) {
    return res.status(400).json({ error: 'Target user ID and permission required' });
  }
  
  if (!['READ', 'EDIT'].includes(permission)) {
    return res.status(400).json({ error: 'Invalid permission. Must be READ or EDIT' });
  }
  
  try {
    const [docRows] = await pool.execute('SELECT owner_id FROM documents WHERE id = ?', [id]);
    if (!docRows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const isAdmin = await documentService.checkAdmin(userId);
    const isOwner = docRows[0].owner_id === userId;
    
    if (!isAdmin && !isOwner) {
      await auditService.log({
        userId,
        documentId: id,
        action: 'GRANT_PERMISSION',
        targetUserId,
        result: 'DENIED',
        ipAddress: ip,
        userAgent,
        metadata: { permission, reason: 'Not owner or admin' }
      });
      return res.status(403).json({ error: 'Only document owner or admin can grant permissions' });
    }
    
    const [targetRows] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [targetUserId]);
    if (!targetRows[0]) {
      return res.status(404).json({ error: 'Target user not found' });
    }
    
    if (targetRows[0].role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot grant permissions to admin users' });
    }
    
    const permId = uuidv4();
    await pool.execute(
      `INSERT INTO document_permissions (id, document_id, user_id, permission, granted_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE permission = ?, granted_by = ?, created_at = CURRENT_TIMESTAMP`,
      [permId, id, targetUserId, permission, userId, permission, userId]
    );
    
    await auditService.log({
      userId,
      documentId: id,
      action: 'GRANT_PERMISSION',
      targetUserId,
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent,
      metadata: { permission }
    });
    
    res.json({ message: 'Permission granted', permission: { documentId: id, userId: targetUserId, permission } });
  } catch (err) {
    console.error('Grant permission error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function revokePermission(req, res) {
  const userId = req.user.id;
  const { id, userId: targetUserId } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  try {
    const [docRows] = await pool.execute('SELECT owner_id FROM documents WHERE id = ?', [id]);
    if (!docRows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const isAdmin = await documentService.checkAdmin(userId);
    const isOwner = docRows[0].owner_id === userId;
    
    if (!isAdmin && !isOwner) {
      await auditService.log({
        userId,
        documentId: id,
        action: 'REVOKE_PERMISSION',
        targetUserId,
        result: 'DENIED',
        ipAddress: ip,
        userAgent,
        metadata: { reason: 'Not owner or admin' }
      });
      return res.status(403).json({ error: 'Only document owner or admin can revoke permissions' });
    }
    
    const [permRows] = await pool.execute(
      'SELECT * FROM document_permissions WHERE document_id = ? AND user_id = ?',
      [id, targetUserId]
    );
    
    if (!permRows[0]) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    await pool.execute('DELETE FROM document_permissions WHERE document_id = ? AND user_id = ?', [id, targetUserId]);
    
    await auditService.log({
      userId,
      documentId: id,
      action: 'REVOKE_PERMISSION',
      targetUserId,
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent
    });
    
    res.json({ message: 'Permission revoked' });
  } catch (err) {
    console.error('Revoke permission error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listPermissions(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  try {
    const [docRows] = await pool.execute('SELECT owner_id FROM documents WHERE id = ?', [id]);
    if (!docRows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const isAdmin = await documentService.checkAdmin(userId);
    const isOwner = docRows[0].owner_id === userId;
    const canEdit = await documentService.checkPermission(userId, id, 'EDIT');
    
    if (!isAdmin && !isOwner && !canEdit) {
      await auditService.log({
        userId,
        documentId: id,
        action: 'LIST_PERMISSIONS',
        result: 'DENIED',
        ipAddress: ip,
        userAgent
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const [rows] = await pool.execute(
      `SELECT dp.*, u.name, u.email, u.role
       FROM document_permissions dp
       JOIN users u ON dp.user_id = u.id
       WHERE dp.document_id = ?`,
      [id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('List permissions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listUsers(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE role != ? ORDER BY name',
      ['ADMIN']
    );
    res.json(rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { grantPermission, revokePermission, listPermissions, listUsers };