const path = require('path');
require('dotenv').config();

const USE_SQLITE = process.env.USE_SQLITE === 'true' || !process.env.DB_HOST;

let pool;

if (USE_SQLITE) {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.resolve(__dirname, '..', '..', 'database', 'trustvault.db');
  const db = new Database(dbPath);

  // Enable foreign keys and WAL mode
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Convert MySQL syntax to SQLite
  function convertSql(sql) {
    return sql
      .replace(/`/g, '"')
      .replace(/AUTO_INCREMENT/g, '')
      .replace(/ENGINE=InnoDB/g, '')
      .replace(/ENUM\([^)]+\)/g, 'TEXT')
      .replace(/JSON/g, 'TEXT')
      .replace(/BIGINT/g, 'INTEGER')
      .replace(/VARCHAR\(\d+\)/g, 'TEXT')
      .replace(/TIMESTAMP/g, 'DATETIME')
      .replace(/CURRENT_DATETIME/g, 'CURRENT_TIMESTAMP')
      .replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/ON UPDATE CURRENT_TIMESTAMP/g, '')
      .replace(/DEFAULT\s+$/gm, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/UNIQUE KEY \w+ \(/g, 'UNIQUE (')
      .replace(/INSERT IGNORE/gi, 'INSERT OR IGNORE')
      .replace(/ON DUPLICATE KEY UPDATE\s+/gi, 'ON CONFLICT(document_id, user_id) DO UPDATE SET ');
  }

  pool = {
    execute: async (sql, params = []) => {
      const sqliteSql = convertSql(sql);
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
      try {
        if (isSelect) {
          const rows = db.prepare(sqliteSql).all(...(Array.isArray(params) ? params : [params]));
          return [rows, []];
        } else {
          const result = db.prepare(sqliteSql).run(...(Array.isArray(params) ? params : [params]));
          return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }, []];
        }
      } catch (err) {
        console.error('SQLite error:', err.message);
        console.error('SQL:', sqliteSql);
        console.error('Params:', params);
        throw err;
      }
    },
    end: () => { db.close(); }
  };

  console.log('Using SQLite database (better-sqlite3)');
} else {
  const mysql = require('mysql2/promise');
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trustvault',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('Using MySQL database');
}

module.exports = pool;