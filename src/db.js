// src/db.js
require('dotenv').config();
const sql = require('mssql');

const config = {
  server: process.env.SQL_SERVER || 'localhost',
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: Number(process.env.SQL_PORT || 1433),
  options: {
    encrypt: String(process.env.SQL_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate: String(process.env.SQL_TRUST_SERVER_CERTIFICATE).toLowerCase() === 'true',
  },
  pool: {
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
  },
};

let pool;

async function getPool() {
  if (pool && pool.connected) return pool;
  if (!pool) pool = new sql.ConnectionPool(config);
  if (!pool.connected) await pool.connect();
  return pool;
}


module.exports = { sql, getPool };
