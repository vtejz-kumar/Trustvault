const documentService = require('../services/documentService');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'backend', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, 'temp_' + Date.now() + '_' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/gif'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file'), false);
    }
  }
});

async function uploadDocument(req, res) {
  console.log('Controller: uploadDocument called');
  console.log('Controller: req.file:', req.file);
  console.log('Controller: req.body:', req.body);
  await documentService.uploadDocument(req, res);
}

async function listDocuments(req, res) {
  await documentService.listDocuments(req, res);
}

async function getDocument(req, res) {
  await documentService.getDocument(req, res);
}

async function downloadDocument(req, res) {
  await documentService.downloadDocument(req, res);
}

async function deleteDocument(req, res) {
  await documentService.deleteDocument(req, res);
}

async function updateDocument(req, res) {
  await documentService.updateDocument(req, res);
}

async function getCategories(req, res) {
  await documentService.getCategories(req, res);
}

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
  updateDocument,
  getCategories,
  upload
};