const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'backend', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif'
];

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, '_').substring(0, 255);
}

async function checkPermission(userId, documentId, requiredPermission) {
  if (!userId || !documentId) return false;
  
  const [docRows] = await pool.execute('SELECT owner_id FROM documents WHERE id = ?', [documentId]);
  if (!docRows[0]) return false;
  
  const document = docRows[0];
  
  if (document.owner_id === userId) return true;
  
  const [permRows] = await pool.execute(
    'SELECT permission FROM document_permissions WHERE document_id = ? AND user_id = ?',
    [documentId, userId]
  );
  
  if (!permRows[0]) return false;
  
  const userPermission = permRows[0].permission;
  
  if (requiredPermission === 'READ') {
    return userPermission === 'READ' || userPermission === 'EDIT';
  }
  if (requiredPermission === 'EDIT') {
    return userPermission === 'EDIT';
  }
  
  return false;
}

async function checkAdmin(userId) {
  const [rows] = await pool.execute('SELECT role FROM users WHERE id = ?', [userId]);
  return rows[0] && rows[0].role === 'ADMIN';
}

async function uploadDocument(req, res) {
  const userId = req.user.id;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  console.log('Upload request received, file:', req.file);
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log('File details:', { size: req.file.size, mimetype: req.file.mimetype, path: req.file.path });
  
  if (req.file.size > MAX_FILE_SIZE) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File size exceeds 10MB limit' });
  }
  
  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File type not allowed' });
  }
  
  const { name, category } = req.body;
  const documentId = uuidv4();
  const safeFileName = `${documentId}_${sanitizeFileName(req.file.originalname)}`;
  const safeName = sanitizeName(name || req.file.originalname);
  const filePath = path.join(UPLOAD_DIR, safeFileName);
  
  console.log('Moving file from', req.file.path, 'to', filePath);
  
  fs.renameSync(req.file.path, filePath);
  
  try {
    console.log('Executing INSERT...');
    await pool.execute(
      `INSERT INTO documents (id, name, owner_id, category, file_path, file_name, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [documentId, safeName, userId, category || 'General', filePath, req.file.originalname, req.file.size, req.file.mimetype]
    );
    
    console.log('INSERT successful, fetching document...');
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [documentId]);
    
    await require('../services/auditService').log({
      userId,
      documentId,
      action: 'UPLOAD',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent,
      metadata: { fileName: req.file.originalname, fileSize: req.file.size }
    });
    
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    console.error('Error stack:', err.stack);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}

async function listDocuments(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { search, category, ownerId, startDate, endDate, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = '';
  const params = [];
  
  if (userRole === 'ADMIN') {
    whereClause = 'WHERE 1=1';
  } else {
    whereClause = `WHERE d.owner_id = ? OR EXISTS (
      SELECT 1 FROM document_permissions dp WHERE dp.document_id = d.id AND dp.user_id = ?
    )`;
    params.push(userId, userId);
  }
  
  if (search) {
    whereClause += (whereClause === 'WHERE 1=1' ? ' AND' : ' AND') + ' d.name LIKE ?';
    params.push(`%${search}%`);
  }
  if (category) {
    whereClause += ' AND d.category = ?';
    params.push(category);
  }
  if (ownerId) {
    whereClause += ' AND d.owner_id = ?';
    params.push(ownerId);
  }
  if (startDate) {
    whereClause += ' AND d.created_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    whereClause += ' AND d.created_at <= ?';
    params.push(endDate);
  }
  
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, u.name as owner_name, u.email as owner_email
       FROM documents d
       LEFT JOIN users u ON d.owner_id = u.id
       ${whereClause}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM documents d ${whereClause}`,
      params
    );
    
    const documentsWithPerms = await Promise.all(rows.map(async (doc) => {
      const canEdit = await checkPermission(userId, doc.id, 'EDIT');
      const canRead = await checkPermission(userId, doc.id, 'READ');
      return { ...doc, canEdit, canRead };
    }));
    
    res.json({
      documents: documentsWithPerms,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getDocument(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, u.name as owner_name, u.email as owner_email
       FROM documents d
       LEFT JOIN users u ON d.owner_id = u.id
       WHERE d.id = ?`,
      [id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = rows[0];
    const canRead = await checkPermission(userId, id, 'READ');
    const canEdit = await checkPermission(userId, id, 'EDIT');
    
    if (!canRead) {
      await require('../services/auditService').log({
        userId,
        documentId: id,
        action: 'VIEW',
        result: 'DENIED',
        ipAddress: ip,
        userAgent
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await require('../services/auditService').log({
      userId,
      documentId: id,
      action: 'VIEW',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent
    });
    
    res.json({ ...document, canEdit, canRead: true });
  } catch (err) {
    console.error('Get document error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function downloadDocument(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  try {
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = rows[0];
    const canRead = await checkPermission(userId, id, 'READ');
    
    if (!canRead) {
      await require('../services/auditService').log({
        userId,
        documentId: id,
        action: 'DOWNLOAD',
        result: 'DENIED',
        ipAddress: ip,
        userAgent
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await require('../services/auditService').log({
      userId,
      documentId: id,
      action: 'DOWNLOAD',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent
    });
    
    res.download(document.file_path, document.file_name);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function deleteDocument(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  try {
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = rows[0];
    const isAdmin = await checkAdmin(userId);
    const isOwner = document.owner_id === userId;
    const canEdit = await checkPermission(userId, id, 'EDIT');
    
    if (!isAdmin && !isOwner && !canEdit) {
      await require('../services/auditService').log({
        userId,
        documentId: id,
        action: 'DELETE',
        result: 'DENIED',
        ipAddress: ip,
        userAgent
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }
    
    await pool.execute('DELETE FROM documents WHERE id = ?', [id]);
    
    await require('../services/auditService').log({
      userId,
      documentId: id,
      action: 'DELETE',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent
    });
    
    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateDocument(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, category } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  try {
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = rows[0];
    const isAdmin = await checkAdmin(userId);
    const isOwner = document.owner_id === userId;
    const canEdit = await checkPermission(userId, id, 'EDIT');
    
    if (!isAdmin && !isOwner && !canEdit) {
      await require('../services/auditService').log({
        userId,
        documentId: id,
        action: 'EDIT',
        result: 'DENIED',
        ipAddress: ip,
        userAgent
      });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await pool.execute(
      'UPDATE documents SET name = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || document.name, category || document.category, id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
    
    await require('../services/auditService').log({
      userId,
      documentId: id,
      action: 'EDIT',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent,
      metadata: { name, category }
    });
    
    res.json(updated[0]);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getCategories(req, res) {
  try {
    const [rows] = await pool.execute('SELECT DISTINCT category FROM documents WHERE category IS NOT NULL');
    res.json(rows.map(r => r.category));
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
  updateDocument,
  getCategories,
  checkPermission,
  checkAdmin
};