// src/middleware/verifyAccess.js
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
const { signAccessToken } = require('../auth/auth.controller');

/**
 * Middleware para validar Access Token y sesión activa
 */
async function verifyAccess(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ message: 'NO_TOKEN' });

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    console.log('payload',payload.sub)
    const pool = await getPool();

   

    const result = await pool.request()
      .input('userId', sql.Int, payload.sub)
      .input('sessionId', sql.NVarChar(50), payload.sessionId)
      .query('SELECT * FROM dbo.UserSessions WHERE SessionId = @sessionId');

      
    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'SESSION_INVALIDATED' });
    }

    req.user = { id: payload.sub, username: payload.username, sessionId: payload.sessionId };

    next();
  } catch (err) {
    console.error('verifyAccess error==============================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================================:', err);
    
    return res.status(401).json({ message: 'INVALID_TOKEN' });
  }
}

module.exports = verifyAccess;
