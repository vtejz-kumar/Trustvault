const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const pool = require('./config/database');

// Auto-initialize SQLite DB tables on startup
async function ensureDatabase() {
  try {
    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try { await pool.execute(stmt); } catch (e) { /* table already exists */ }
        }
      }
      console.log('Database schema ready.');
    }
  } catch (err) {
    console.error('DB init warning:', err.message);
  }
}

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email && !password) {
    return;
  }

  if (!email || !password) {
    throw new Error('Both ADMIN_EMAIL and ADMIN_PASSWORD must be configured together.');
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const [existingUsers] = await pool.execute(
    'SELECT id, role FROM users WHERE email = ?',
    [email]
  );

  if (existingUsers.length > 0) {
    if (existingUsers[0].role !== 'ADMIN') {
      throw new Error(`The configured admin email ${email} belongs to a non-admin account.`);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, existingUsers[0].id]
    );
    console.log(`Updated configured admin account credentials for ${email}.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.execute(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), process.env.ADMIN_NAME?.trim() || 'Admin User', email, passwordHash, 'ADMIN']
  );

  console.log(`Created configured admin account for ${email}.`);
}


const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  'https://build-five-green.vercel.app',
  'https://build-five-green.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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
ensureDatabase()
  .then(ensureAdminAccount)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`TrustVault backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Backend startup failed:', err.message);
    process.exit(1);
  });

module.exports = app;