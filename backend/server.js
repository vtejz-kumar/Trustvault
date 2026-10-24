const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
// NOTE: /uploads NOT served statically - all file access goes through authorized endpoints

// Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);

const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const auditRoutes = require('./routes/auditRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`TrustVault backend running on port ${PORT}`);
});

module.exports = app;