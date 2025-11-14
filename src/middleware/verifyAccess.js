// src/middleware/verifyAccess.js
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');

/**
 * Middleware para validar Access Token y sesión activa
 */
async function verifyAccess(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ message: 'NO_TOKEN' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'NO_TOKEN' });
    }

    // Verificar token JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const pool = await getPool();

    // Verificar que la sesión exista y el usuario esté activo
    const result = await pool.request()
      .input('userId', sql.Int, payload.sub)
      .input('sessionId', sql.NVarChar(50), payload.sessionId)
      .query(`
        SELECT us.*, u.Activo, u.NombreUsuario, u.NombreCompleto
        FROM dbo.UserSessions us
        INNER JOIN UsuariosApp u ON us.UserId = u.UsuarioID
        WHERE us.SessionId = @sessionId AND us.UserId = @userId
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'SESSION_INVALIDATED' });
    }

    const session = result.recordset[0];

    // Verificar que el usuario esté activo
    if (session.Activo === false || session.Activo === 0) {
      return res.status(403).json({ message: 'USER_INACTIVE' });
    }

    // Agregar datos del usuario al request
    req.user = {
      id: payload.sub,
      username: payload.username,
      sessionId: payload.sessionId,
      fullName: session.NombreCompleto
    };

    next();
  } catch (err) {
    console.error('verifyAccess error:', err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'TOKEN_EXPIRED' });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'INVALID_TOKEN' });
    }

    return res.status(401).json({ message: 'AUTHENTICATION_FAILED' });
  }
}

module.exports = verifyAccess;