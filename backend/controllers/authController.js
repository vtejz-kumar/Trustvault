const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const auditService = require('../services/auditService');

async function login(req, res) {
  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    
    if (!user) {
      await auditService.log({
        userId: null,
        action: 'LOGIN',
        result: 'DENIED',
        ipAddress: ip,
        userAgent,
        metadata: { email, reason: 'User not found' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      await auditService.log({
        userId: user.id,
        action: 'LOGIN',
        result: 'DENIED',
        ipAddress: ip,
        userAgent,
        metadata: { email, reason: 'Invalid password' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    await auditService.log({
      userId: user.id,
      action: 'LOGIN',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent
    });
    
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getProfile(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function register(req, res) {
  const { name, email, password, role } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');
  
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role required' });
  }
  
  if (!['OWNER', 'VIEWER'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be OWNER or VIEWER' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows[0]) {
      await auditService.log({
        userId: null,
        action: 'REGISTER',
        result: 'DENIED',
        ipAddress: ip,
        userAgent,
        metadata: { email, reason: 'Email already exists' }
      });
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    
    await pool.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, passwordHash, role]
    );
    
    const token = jwt.sign(
      { id: userId, email, role, name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    await auditService.log({
      userId,
      action: 'REGISTER',
      result: 'SUCCESS',
      ipAddress: ip,
      userAgent,
      metadata: { role }
    });
    
    res.status(201).json({
      token,
      user: { id: userId, name, email, role }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { login, getProfile, register };