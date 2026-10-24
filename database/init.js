const pool = require('../backend/config/database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  const statements = schema.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await pool.execute(statement);
        console.log('Executed:', statement.trim().substring(0, 60) + '...');
      } catch (err) {
        console.error('Error executing:', statement.trim().substring(0, 60));
        console.error(err.message);
      }
    }
  }
  
  console.log('Database initialized successfully');
  process.exit(0);
}

initializeDatabase().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});