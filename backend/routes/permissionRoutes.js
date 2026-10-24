const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/users', authenticateToken, permissionController.listUsers);
router.get('/:id', authenticateToken, permissionController.listPermissions);
router.post('/:id', authenticateToken, permissionController.grantPermission);
router.delete('/:id/:userId', authenticateToken, permissionController.revokePermission);

module.exports = router;