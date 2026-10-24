const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');

// Multer error handling middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 10MB limit' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'File type not allowed' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  if (err && err.message === 'File type not allowed') {
    return res.status(400).json({ error: 'File type not allowed' });
  }
  next(err);
}

router.post('/upload', authenticateToken, documentController.upload.single('file'), handleMulterError, documentController.uploadDocument);
router.get('/', authenticateToken, documentController.listDocuments);
router.get('/categories', authenticateToken, documentController.getCategories);
router.get('/:id', authenticateToken, documentController.getDocument);
router.get('/:id/download', authenticateToken, documentController.downloadDocument);
router.put('/:id', authenticateToken, documentController.updateDocument);
router.delete('/:id', authenticateToken, documentController.deleteDocument);

module.exports = router;