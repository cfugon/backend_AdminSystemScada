// src/auth/auth.controller.js
const bcrypt = require('bcryptjs'); // Para encriptar/verificar contraseñas
const jwt = require('jsonwebtoken'); // Para crear/verificar tokens JWT
const { getPool, sql } = require('../db'); // Conexión a SQL Server
const { assert } = require('../utils/validate'); // Validaciones personalizadas
const { v4: uuidv4 } = require('uuid'); // Para generar sessionId



// ========================
// 🔑 Funciones para crear tokens
// ========================

// Access token → válido por pocos minutos
function signAccessToken(user) {
  return jwt.sign(
    { username: user.Username },          // Payload con username
    process.env.JWT_SECRET,               // Clave secreta
    { subject: String(user.Id) }
  );
}

// Refresh token → válido por días/semanas
function signRefreshToken(user) {
  return jwt.sign(
    { username: user.Username },          // Payload con username
    process.env.REFRESH_SECRET,           // Clave secreta para refresh
    { subject: String(user.Id) }
  );
}

// ========================
// 📌 Registro de usuario
// ========================
async function register(req, res, next) {
  try {
    const { username, password, fullName } = req.body || {};
    assert(typeof username === 'string' && username.length >= 3, 'Username inválido');
    assert(typeof password === 'string' && password.length >= 6, 'La contraseña debe tener al menos 6 caracteres');

    const pool = await getPool();

    const exists = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query(`select top 1 *,Concat(Nombre,' ', Apellido) fullName from Usuario where Usuario = @username`);
    assert(exists.recordset.length === 0, 'El usuario ya existe', 409);

    const hash = await bcrypt.hash(password, 10);
    console.log('hash', hash);

    const insert = await pool.request()
      .input('Usuario', sql.NVarChar(100), username)
      .input('hash', sql.NVarChar(200), hash)
      .input('fullName', sql.NVarChar(200), fullName || null)
      .query(`
        INSERT INTO dbo.Users (Username, PasswordHash, FullName)
        OUTPUT Inserted.Id, Inserted.Username, Inserted.FullName
        VALUES (@username, @hash, @fullName);
      `);

    const user = insert.recordset[0];


    // Generar sessionId único
    const sessionId = uuidv4();

    // Crear tokens incluyendo sessionId en payload
    const access = jwt.sign(
      { username: user.Username, sessionId },
      process.env.JWT_SECRET,
      { subject: String(user.Id), expiresIn: process.env.JWT_EXPIRES || '1m' }
    );

    const refresh = jwt.sign(
      { username: user.Username, sessionId },
      process.env.REFRESH_SECRET,
      { subject: String(user.Id), expiresIn: process.env.REFRESH_EXPIRES || '30d' }
    );

    // Guardar sesión en DB
    await pool.request()
      .input('userId', sql.Int, user.Id)
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .input('sessionId', sql.NVarChar(50), sessionId)
      .query('INSERT INTO dbo.UserSessions (UserId, RefreshToken, SessionId, CreatedAt) VALUES (@userId, @refreshToken, @sessionId, GETDATE())');


    res.status(201).json({
      user: { id: user.Id, username: user.Username, fullName: user.FullName },
      tokens: { access, refresh }
    });

  } catch (e) {
    next(e);
  }
}

// ========================
// 📌 Login de usuario
// ========================
async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};

    assert(typeof username === 'string', 'Username requerido');
    assert(typeof password === 'string', 'Contraseña requerida');

    const pool = await getPool();
    const q = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query(`select *, password  PasswordHash,Concat(Nombre,' ' ,Apellido) FullName from Usuario where Usuario =@username`);
    // .query(`
    //     SELECT u.*, u.password PasswordHash, CONCAT(u.Nombre, u.Apellido) FullName
    //     FROM Usuario u
    //     INNER JOIN UsuarioAcciones ua ON u.UsuarioId = ua.IdUsuario
    //     INNER JOIN Acciones a ON ua.IdAction = a.Id
    //     WHERE u.Usuario = @username AND a.Nombre = 'APP'
    //   `);

    assert(q.recordset.length === 1, 'Credenciales inválidas', 401);
    const user = q.recordset[0];


    // Comparar contraseña
    const ok = await bcrypt.compare(password, user.PasswordHash);
    assert(ok, 'Credenciales inválidas', 401);

    console.log('POR AQUI', ok);

    // Generar sessionId único
    const sessionId = uuidv4();


    // Crear tokens con sessionId
    const access = jwt.sign(
      { username: user.Username, sessionId },
      process.env.JWT_SECRET,
      { subject: String(user.UsuarioId) }
    );

    const refresh = jwt.sign(
      { username: user.Username, sessionId },
      process.env.REFRESH_SECRET,
      { subject: String(user.UsuarioId) }
    );



    // Buscar acciones/permisos del usuario
    const accionesQuery = await pool.request()
      .input('idUsuario', sql.Int, user.UsuarioId)
      .query(`
    SELECT a.Id, a.Nombre
    FROM Acciones a
    INNER JOIN UsuarioAcciones ua ON a.Id = ua.IdAction
    WHERE ua.IdUsuario = @idUsuario
  `);

    const acciones = accionesQuery.recordset;



    // Eliminar sesiones anteriores → solo 1 sesión activa por usuario
    await pool.request()
      .input('userId', sql.Int, user.UsuarioId)
      .query('DELETE FROM dbo.UserSessions WHERE UserId = @userId');


    // Guardar nueva sesión
    await pool.request()
      .input('userId', sql.Int, user.UsuarioId)
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .input('sessionId', sql.NVarChar(50), sessionId)
      .query('INSERT INTO dbo.UserSessions (UserId, RefreshToken, SessionId, CreatedAt) VALUES (@userId, @refreshToken, @sessionId, GETDATE())');


    res.json({
      user: {
        id: user.UsuarioId,
        username: user.Usuario,
        fullName: user.FullName,
        accesos: acciones  // 👈 aquí agregas los permisos dentro del user
      },
      tokens: { access, refresh, sessionId }
    });

  } catch (e) {
    next(e);
  }
}




// ========================
// 📌 Login de usuario app clientes
// ========================
async function loginClientes(req, res, next) {
  try {
    const { username, password } = req.body || {};

    assert(typeof username === 'string', 'Username requerido');
    assert(typeof password === 'string', 'Contraseña requerida');

    const pool = await getPool();
    const q = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query(`select u.*, u.password  PasswordHash,Concat(u.Nombre,' ' ,u.Apellido) FullName from Usuario u
    inner join UsuarioAcciones ua on u.UsuarioId = ua.IdUsuario  
    inner join UsuariosClientes uc on u.UsuarioId = uc.UsuarioId
where u.Estado = 1 and ua.IdAction = 5 and Usuario =@username`);
    // .query(`
    //     SELECT u.*, u.password PasswordHash, CONCAT(u.Nombre, u.Apellido) FullName
    //     FROM Usuario u
    //     INNER JOIN UsuarioAcciones ua ON u.UsuarioId = ua.IdUsuario
    //     INNER JOIN Acciones a ON ua.IdAction = a.Id
    //     WHERE u.Usuario = @username AND a.Nombre = 'APP'
    //   `);

    assert(q.recordset.length === 1, 'Credenciales inválidas', 401);
    const user = q.recordset[0];


    // Comparar contraseña
    const ok = await bcrypt.compare(password, user.PasswordHash);
    assert(ok, 'Credenciales inválidas', 401);

    console.log('POR AQUI', ok);

    // Generar sessionId único
    const sessionId = uuidv4();


    // Crear tokens con sessionId
    const access = jwt.sign(
      { username: user.Username, sessionId },
      process.env.JWT_SECRET,
      { subject: String(user.UsuarioId) }
    );

    const refresh = jwt.sign(
      { username: user.Username, sessionId },
      process.env.REFRESH_SECRET,
      { subject: String(user.UsuarioId) }
    );



    // Buscar acciones/permisos del usuario
    const accionesQuery = await pool.request()
      .input('idUsuario', sql.Int, user.UsuarioId)
      .query(`
    SELECT a.Id, a.Nombre
    FROM Acciones a
    INNER JOIN UsuarioAcciones ua ON a.Id = ua.IdAction
    WHERE ua.IdUsuario = @idUsuario
  `);

    const acciones = accionesQuery.recordset;



    // Eliminar sesiones anteriores → solo 1 sesión activa por usuario
    await pool.request()
      .input('userId', sql.Int, user.UsuarioId)
      .query('DELETE FROM dbo.UserSessions WHERE UserId = @userId');


    // Guardar nueva sesión
    await pool.request()
      .input('userId', sql.Int, user.UsuarioId)
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .input('sessionId', sql.NVarChar(50), sessionId)
      .query('INSERT INTO dbo.UserSessions (UserId, RefreshToken, SessionId, CreatedAt) VALUES (@userId, @refreshToken, @sessionId, GETDATE())');


    res.json({
      user: {
        id: user.UsuarioId,
        username: user.Usuario,
        fullName: user.FullName,
        accesos: acciones  // 👈 aquí agregas los permisos dentro del user
      },
      tokens: { access, refresh, sessionId }
    });

  } catch (e) {
    next(e);
  }
}




// ========================
// 📌 Logout → elimina la sesión
// ========================
async function logout(req, res, next) {
  try {
    const { refresh } = req.body || {};
    if (!refresh) return res.status(400).json({ message: 'Refresh token requerido' });


    const pool = await getPool();
    await pool.request()
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .query('DELETE FROM dbo.UserSessions WHERE RefreshToken = @refreshToken');

    res.json({ message: 'Sesión cerrada' });
  } catch (e) {
    next(e);
  }
}

// ========================
// 📌 Refresh token → nuevo access
// ========================
async function refreshToken(req, res, next) {
  try {
    const { refresh } = req.body || {};
    assert(typeof refresh === 'string', 'Refresh token requerido', 401);

    const pool = await getPool();

    // Verificar que el refresh existe en la DB
    const check = await pool.request()
      .input('refreshToken', sql.NVarChar(sql.MAX), refresh)
      .query('SELECT * FROM dbo.UserSessions WHERE RefreshToken = @refreshToken');

    assert(check.recordset.length === 1, 'Refresh token inválido o expirado', 401);

    // Decodificar payload del refresh token
    const payload = jwt.verify(refresh, process.env.REFRESH_SECRET);
    const user = { Id: payload.sub, Username: payload.username };

    // Crear un nuevo access token
    const access = signAccessToken(user);
    res.json({ access });
  } catch (e) {
    e.status = 401;
    next(e);
  }
}

module.exports = { register, login,loginClientes, refreshToken, signAccessToken, logout };
