// src/users/users.controller.js
const { getPool, sql } = require('../db');

async function me(req, res, next) {
  try {
    const pool = await getPool();
    const q = await pool.request()
      .input('id', sql.Int, Number(req.user.id))
      .query(`
        SELECT Id, Username, FullName, CreatedAt
        FROM dbo.Users WHERE Id = @id;
      `);

    if (!q.recordset.length) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(q.recordset[0]);
  } catch (e) {
    next(e);
  }
}

module.exports = { me };
