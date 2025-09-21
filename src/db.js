require("dotenv").config();
const sql = require("mssql");

const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: Number(process.env.SQL_PORT || 1433),
  options: {
    encrypt: String(process.env.SQL_ENCRYPT).toLowerCase() === "true", // recomendado para Somee
    trustServerCertificate: String(process.env.SQL_TRUST_SERVER_CERTIFICATE).toLowerCase() === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool;

async function getPool() {
  try {
    if (!pool) {
      pool = await sql.connect(config); // 👈 usar sql.connect directo
      console.log("✅ Conectado a SQL Server");
    }
    return pool;
  } catch (err) {
    console.error("❌ Error de conexión SQL:", err.message);
    throw err;
  }
}

module.exports = { sql, getPool };
