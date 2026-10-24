const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const USE_SQLITE = process.env.USE_SQLITE === 'true' || !process.env.DB_HOST;

let pool;

if (USE_SQLITE) {
  const dbPath = path.resolve(__dirname, '..', '..', 'database', 'trustvault.db');
  const sqliteDb = new sqlite3.Database(dbPath);
  
  // Enable foreign keys
  sqliteDb.run('PRAGMA foreign_keys = ON');
  sqliteDb.run('PRAGMA journal_mode = WAL');
  
  // Promisify sqlite3 methods
  const run = (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ insertId: this.lastID, affectedRows: this.changes });
    });
  });
  
  const all = (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  const get = (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
  
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
      .replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/g, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/ON UPDATE CURRENT_TIMESTAMP/g, '')
      .replace(/DEFAULT\s+$/gm, 'DEFAULT CURRENT_TIMESTAMP')
      .replace(/UNIQUE KEY \w+ \(/g, 'UNIQUE (')
      .replace(/ON DELETE CASCADE/g, 'ON DELETE CASCADE')
      .replace(/INSERT IGNORE/gi, 'INSERT OR IGNORE')
      .replace(/ON DUPLICATE KEY UPDATE\s+/gi, 'ON CONFLICT(document_id, user_id) DO UPDATE SET ');
  }
  
  pool = {
    execute: async (sql, params = []) => {
      const sqliteSql = convertSql(sql);
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
      
      try {
        if (isSelect) {
          const rows = await all(sqliteSql, params);
          return [rows, []];
        } else {
          const result = await run(sqliteSql, params);
          return [result, []];
        }
      } catch (err) {
        console.error('SQLite error:', err.message);
        console.error('SQL:', sqliteSql);
        console.error('Params:', params);
        throw err;
      }
    },
    end: () => new Promise((resolve) => sqliteDb.close(resolve))
  };
  
  console.log('Using SQLite database (development mode)');
} else {
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