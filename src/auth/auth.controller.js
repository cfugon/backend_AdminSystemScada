// src/auth/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../db');
const { assert } = require('../utils/validate');
const { v4: uuidv4 } = require('uuid');

// ========================
// 🔑 Funciones para crear tokens
// ========================

function signAccessToken(user) {
  return jwt.sign(
    { username: user.NombreUsuario, sessionId: user.sessionId },
    process.env.JWT_SECRET,
    {
      subject: String(user.UsuarioID),
      expiresIn: process.env.JWT_EXPIRES || '15m'
    }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { username: user.NombreUsuario, sessionId: user.sessionId },
    process.env.REFRESH_SECRET,
    {
      subject: String(user.UsuarioID),
      expiresIn: process.env.REFRESH_EXPIRES || '30d'
    }
  );
}

// ========================
// 📌 Login de usuario
// ========================
async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};

    console.log('📥 Intento de login:', { username });

    assert(typeof username === 'string', 'Username requerido');
    assert(typeof password === 'string', 'Contraseña requerida');

    const pool = await getPool();

    // Buscar usuario por nombre de usuario
    const userQuery = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query(`
        SELECT 
          UsuarioID,
          NombreUsuario,
          NombreCompleto,
          Email,
          Contrasena,
          Activo,
          Telefono,
          Puesto
        FROM UsuariosApp
        WHERE NombreUsuario = @username
      `);

    console.log('🔍 Usuario encontrado:', userQuery.recordset.length > 0 ? 'Sí' : 'No');

    if (userQuery.recordset.length === 0) {
      console.log('❌ Usuario no encontrado en la base de datos');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = userQuery.recordset[0];

    console.log('👤 Datos del usuario:', {
      UsuarioID: user.UsuarioID,
      NombreUsuario: user.NombreUsuario,
      Email: user.Email,
      Activo: user.Activo
    });

    // Verificar que el usuario esté activo
    if (user.Activo === false || user.Activo === 0) {
      console.log('❌ Usuario inactivo');
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo. Contacte al administrador'
      });
    }

    console.log('🔍 DEBUGGING PASSWORD COMPARISON:');
    console.log('Password recibido:', password);
    console.log('Password length:', password.length);
    console.log('Password bytes:', Buffer.from(password).toString('hex'));
    console.log('Hash de BD:', user.Contrasena);
    console.log('Hash length:', user.Contrasena?.length);
    console.log('Hash preview:', user.Contrasena?.substring(0, 30));




    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, user.Contrasena);
    console.log('🔒 Resultado de bcrypt.compare:', passwordMatch);

    if (!passwordMatch) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    console.log('✅ Contraseña correcta, generando tokens...');

    // ✅ Generar sessionId único
    const sessionId = uuidv4();

    // ✅ Crear tokens con sessionId
    const access = jwt.sign(
      { username: user.NombreUsuario, sessionId },
      process.env.JWT_SECRET,
      {
        subject: String(user.UsuarioID),
        expiresIn: process.env.JWT_EXPIRES || '15m'
      }
    );

    const refresh = jwt.sign(
      { username: user.NombreUsuario, sessionId },
      process.env.REFRESH_SECRET,
      {
        subject: String(user.UsuarioID),
        expiresIn: process.env.REFRESH_EXPIRES || '30d'
      }
    );

    console.log('✅ Tokens generados');

    // ✅ Obtener permisos del usuario (menú)
    const permisosQuery = await pool.request()
      .input('usuarioId', sql.Int, user.UsuarioID)
      .query(`
        SELECT 
          m.ModuloID,
          m.NombreModulo AS Nombre,
          m.Descripcion,
          m.Ruta,
          m.Icono,
          m.Orden,
          p.PuedeLeer,
          p.PuedeEscribir
        FROM Modulos m
        INNER JOIN Permisos p ON m.ModuloID = p.ModuloID
        WHERE m.Activo = 1 
          AND p.UsuarioID = @usuarioId
          AND p.PuedeLeer = 1
        ORDER BY m.Orden
      `);

    const accesos = permisosQuery.recordset;
    console.log('📋 Permisos cargados:', accesos.length);

    // ✅ Eliminar sesiones anteriores del usuario (opcional: solo 1 sesión activa)
    await pool.request()
      .input('userId', sql.Int, user.UsuarioID)
      .query('DELETE FROM dbo.UserSessions WHERE UserId = @userId');

    // ✅ Guardar nueva sesión
    await pool.request()
      .input('userId', sql.Int, user.UsuarioID)
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .input('sessionId', sql.NVarChar(50), sessionId)
      .query(`
        INSERT INTO dbo.UserSessions (UserId, RefreshToken, SessionId, CreatedAt) 
        VALUES (@userId, @refreshToken, @sessionId, GETDATE())
      `);

    console.log('✅ Sesión guardada');

    // ✅ Actualizar último acceso del usuario
    await pool.request()
      .input('usuarioId', sql.Int, user.UsuarioID)
      .query(`
        UPDATE UsuariosApp 
        SET UltimoAcceso = GETDATE() 
        WHERE UsuarioID = @usuarioId
      `);

    console.log('✅ Login exitoso para:', user.NombreUsuario);

    // ✅ Responder con datos del usuario y tokens
    res.json({
      user: {
        id: user.UsuarioID,
        username: user.NombreUsuario,
        fullName: user.NombreCompleto,
        nombre: user.NombreCompleto,
        email: user.Email,
        telefono: user.Telefono,
        puesto: user.Puesto,
        activo: user.Activo,
        accesos: accesos
      },
      tokens: {
        access,
        refresh,
        sessionId
      }
    });

  } catch (e) {
    console.error('💥 Error en login:', e);
    next(e);
  }
}
// ========================
// 📌 Registro de usuario (opcional)
// ========================
async function register(req, res, next) {
  try {
    const { username, password, fullName, email, telefono, puesto } = req.body || {};

    assert(typeof username === 'string' && username.length >= 3, 'Username inválido');
    assert(typeof password === 'string' && password.length >= 6, 'La contraseña debe tener al menos 6 caracteres');
    assert(typeof fullName === 'string' && fullName.length >= 3, 'Nombre completo requerido');
    assert(typeof email === 'string' && email.includes('@'), 'Email inválido');

    const pool = await getPool();

    // Verificar si el usuario ya existe
    const exists = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .input('email', sql.NVarChar(100), email)
      .query(`
        SELECT UsuarioID 
        FROM UsuariosApp 
        WHERE NombreUsuario = @username OR Email = @email
      `);

    assert(exists.recordset.length === 0, 'El usuario o email ya existe', 409);

    // Encriptar contraseña
    const hash = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    const insert = await pool.request()
      .input('nombreUsuario', sql.NVarChar(50), username)
      .input('nombreCompleto', sql.NVarChar(100), fullName)
      .input('email', sql.NVarChar(100), email)
      .input('contrasena', sql.NVarChar(255), hash)
      .input('telefono', sql.NVarChar(20), telefono || null)
      .input('puesto', sql.NVarChar(50), puesto || null)
      .query(`
        INSERT INTO UsuariosApp (
          NombreUsuario, 
          NombreCompleto, 
          Email, 
          Contrasena, 
          Telefono, 
          Puesto, 
          Activo, 
          FechaCreacion
        )
        OUTPUT 
          Inserted.UsuarioID, 
          Inserted.NombreUsuario, 
          Inserted.NombreCompleto,
          Inserted.Email
        VALUES (
          @nombreUsuario, 
          @nombreCompleto, 
          @email, 
          @contrasena, 
          @telefono, 
          @puesto, 
          1, 
          GETDATE()
        )
      `);

    const user = insert.recordset[0];

    // Generar sessionId único
    const sessionId = uuidv4();

    // Crear tokens
    const access = jwt.sign(
      { username: user.NombreUsuario, sessionId },
      process.env.JWT_SECRET,
      {
        subject: String(user.UsuarioID),
        expiresIn: process.env.JWT_EXPIRES || '15m'
      }
    );

    const refresh = jwt.sign(
      { username: user.NombreUsuario, sessionId },
      process.env.REFRESH_SECRET,
      {
        subject: String(user.UsuarioID),
        expiresIn: process.env.REFRESH_EXPIRES || '30d'
      }
    );

    // Guardar sesión en DB
    await pool.request()
      .input('userId', sql.Int, user.UsuarioID)
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .input('sessionId', sql.NVarChar(50), sessionId)
      .query(`
        INSERT INTO dbo.UserSessions (UserId, RefreshToken, SessionId, CreatedAt) 
        VALUES (@userId, @refreshToken, @sessionId, GETDATE())
      `);

    res.status(201).json({
      user: {
        id: user.UsuarioID,
        username: user.NombreUsuario,
        fullName: user.NombreCompleto,
        email: user.Email
      },
      tokens: { access, refresh, sessionId }
    });

  } catch (e) {
    console.error('Error en registro:', e);
    next(e);
  }
}

// ========================
// 📌 Logout → elimina la sesión
// ========================
async function logout(req, res, next) {
  try {
    const { refresh, sessionId } = req.body || {};

    if (!refresh && !sessionId) {
      return res.status(400).json({ message: 'Refresh token o sessionId requerido' });
    }

    const pool = await getPool();

    if (sessionId) {
      await pool.request()
        .input('sessionId', sql.NVarChar(50), sessionId)
        .query('DELETE FROM dbo.UserSessions WHERE SessionId = @sessionId');
    } else {
      await pool.request()
        .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
        .query('DELETE FROM dbo.UserSessions WHERE RefreshToken = @refreshToken');
    }

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (e) {
    console.error('Error en logout:', e);
    next(e);
  }
}

// ========================
// 📌 Refresh token → nuevo access
// ========================
async function refreshToken(req, res, next) {
  try {
    const { refresh, sessionId } = req.body || {};
    assert(typeof refresh === 'string', 'Refresh token requerido', 401);

    const pool = await getPool();

    // Verificar que el refresh token existe en la DB
    const check = await pool.request()
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .input('sessionId', sql.NVarChar(50), sessionId || null)
      .query(`
        SELECT us.*, u.NombreUsuario, u.Activo
        FROM dbo.UserSessions us
        INNER JOIN UsuariosApp u ON us.UserId = u.UsuarioID
        WHERE us.RefreshToken = @refreshToken
        ${sessionId ? 'AND us.SessionId = @sessionId' : ''}
      `);

    assert(check.recordset.length === 1, 'Refresh token inválido o expirado', 401);

    const session = check.recordset[0];

    // Verificar que el usuario siga activo
    assert(session.Activo === true || session.Activo === 1, 'Usuario inactivo', 403);

    // Decodificar payload del refresh token
    const payload = jwt.verify(refresh, process.env.REFRESH_SECRET);

    // Crear un nuevo access token
    const access = jwt.sign(
      { username: session.NombreUsuario, sessionId: session.SessionId },
      process.env.JWT_SECRET,
      {
        subject: String(payload.sub),
        expiresIn: process.env.JWT_EXPIRES || '15m'
      }
    );

    res.json({ access });
  } catch (e) {
    console.error('Error en refresh token:', e);
    e.status = 401;
    next(e);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  signAccessToken,
  logout
};