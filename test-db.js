// test-db.js
require('dotenv').config();
const { getPool } = require('./src/db');

(async () => {
  try {
    const pool = await getPool();
    console.log('✅ Conexión exitosa a SQL Server');
    await pool.close(); // Cierra el pool después de probar
  } catch (err) {
    console.error('❌ Error de conexión:', err);
  }
})();
