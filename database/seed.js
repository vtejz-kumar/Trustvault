const pool = require('../backend/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const users = [
  { id: uuidv4(), name: 'Admin User', email: 'admin@trustvault.com', password: 'admin123', role: 'ADMIN' },
  { id: uuidv4(), name: 'Owner User', email: 'owner@trustvault.com', password: 'owner123', role: 'OWNER' },
  { id: uuidv4(), name: 'Viewer User', email: 'viewer@trustvault.com', password: 'viewer123', role: 'VIEWER' },
];

async function seedDatabase() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    
    try {
      await pool.execute(
        'INSERT IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [user.id, user.name, user.email, passwordHash, user.role]
      );
      console.log(`Created user: ${user.email} (${user.role})`);
    } catch (err) {
      console.error(`Error creating user ${user.email}:`, err.message);
    }
  }
  
  console.log('\n=== Demo Accounts ===');
  console.log('Admin:  admin@trustvault.com  / admin123');
  console.log('Owner:  owner@trustvault.com  / owner123');
  console.log('Viewer: viewer@trustvault.com / viewer123');
  console.log('\nDatabase seeded successfully');
  process.exit(0);
}

seedDatabase().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});