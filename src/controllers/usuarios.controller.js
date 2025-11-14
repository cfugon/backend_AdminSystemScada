const { sql, getPool } = require('../db');
const bcrypt = require('bcrypt');

// ============================================
// USUARIOS Y PERMISOS (usando SP)
// ============================================

/**
 * Gestiona usuarios y permisos usando el procedimiento almacenado sp_GestionUsuariosPermisos
 * 
 * Operaciones disponibles:
 * @op 1 = Obtener permisos de un usuario (p1 = UsuarioID)
 * @op 2 = Verificar permiso específico (p1 = UsuarioID, p2 = ModuloID, p3 = 'LEER'/'ESCRIBIR')
 * @op 3 = Asignar/actualizar permisos (p1 = UsuarioID, p2 = ModuloID, p3 = AsignadoPor, p4 = PuedeLeer, p5 = PuedeEscribir)
 * @op 4 = Obtener menú del usuario (p1 = UsuarioID)
 * @op 5 = Obtener usuarios activos
 * @op 6 = Obtener todos los usuarios
 * @op 7 = Obtener usuario por ID (p1 = UsuarioID)
 * @op 8 = Obtener módulos activos
 * @op 9 = Cambiar estado usuario (p1 = UsuarioID, p4 = Estado)
 * @op 10 = Actualizar último acceso (p1 = UsuarioID)
 * @op 11 = Eliminar permiso módulo (p1 = UsuarioID, p2 = ModuloID)
 * @op 12 = Eliminar todos los permisos (p1 = UsuarioID)
 */
async function gestionUsuariosPermisos(req, res) {
  try {
    const { op, p1, p2, p3, p4, p5 } = req.query;
    
    if (!op) {
      return res.status(400).json({ 
        success: false, 
        message: 'Parámetro "op" requerido' 
      });
    }

    const pool = await getPool();

    const request = pool.request()
      .input('op', sql.Int, parseInt(op, 10))
      .input('p1', sql.Int, p1 ? parseInt(p1, 10) : null)
      .input('p2', sql.Int, p2 ? parseInt(p2, 10) : null)
      .input('p3', sql.NVarChar(20), p3 || null)
      .input('p4', sql.Bit, p4 !== undefined ? (p4 === '1' || p4 === 'true' ? 1 : 0) : null)
      .input('p5', sql.Bit, p5 !== undefined ? (p5 === '1' || p5 === 'true' ? 1 : 0) : null);

    const result = await request.execute('sp_GestionUsuariosPermisos');

    // Para operaciones que retornan Resultado/Mensaje
    if (result.recordset[0] && result.recordset[0].Resultado !== undefined) {
      return res.json({
        success: result.recordset[0].Resultado === 1,
        message: result.recordset[0].Mensaje,
        Resultado: result.recordset[0].Resultado,
        Mensaje: result.recordset[0].Mensaje
      });
    }

    // Para operaciones que retornan datos
    res.json({ success: true, data: result.recordset });

  } catch (err) {
    console.error('Error en gestión de usuarios/permisos:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al procesar la operación' 
    });
  }
}

// ============================================
// CREAR USUARIO (sin SP - gestión directa)
// ============================================

/**
 * Crea un nuevo usuario
 * Body: { nombreUsuario, nombreCompleto, email, contrasena, telefono, puesto, activo }
 */
async function createUsuario(req, res) {
  try {
    const { nombreUsuario, nombreCompleto, email, contrasena, telefono, puesto, activo } = req.body;

    // Validaciones básicas
    if (!nombreUsuario || !nombreCompleto || !email || !contrasena) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campos requeridos: nombreUsuario, nombreCompleto, email, contrasena' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de email inválido' 
      });
    }

    // Validar longitud de contraseña
    if (contrasena.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    const pool = await getPool();
    
    // Verificar si el usuario o email ya existe
    const checkExist = await pool.request()
      .input('NombreUsuario', sql.VarChar(50), nombreUsuario)
      .input('Email', sql.VarChar(100), email)
      .query(`
        SELECT 
          CASE WHEN EXISTS(SELECT 1 FROM UsuariosApp WHERE NombreUsuario = @NombreUsuario) 
            THEN 1 ELSE 0 END AS UsuarioExiste,
          CASE WHEN EXISTS(SELECT 1 FROM UsuariosApp WHERE Email = @Email) 
            THEN 1 ELSE 0 END AS EmailExiste
      `);

    if (checkExist.recordset[0].UsuarioExiste) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de usuario ya está en uso' 
      });
    }

    if (checkExist.recordset[0].EmailExiste) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email ya está registrado' 
      });
    }

    // Insertar nuevo usuario
    const result = await pool.request()
      .input('NombreUsuario', sql.VarChar(50), nombreUsuario)
      .input('NombreCompleto', sql.VarChar(100), nombreCompleto)
      .input('Email', sql.VarChar(100), email)
      .input('Contrasena', sql.VarChar(255), hashedPassword)
      .input('Telefono', sql.VarChar(20), telefono || null)
      .input('Puesto', sql.VarChar(50), puesto || null)
      .input('Activo', sql.Bit, activo !== false ? 1 : 0)
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
        VALUES (
          @NombreUsuario, 
          @NombreCompleto, 
          @Email, 
          @Contrasena, 
          @Telefono, 
          @Puesto, 
          @Activo, 
          GETDATE()
        );
        
        SELECT SCOPE_IDENTITY() AS UsuarioID;
      `);

    res.status(201).json({ 
      success: true, 
      message: 'Usuario creado correctamente',
      data: { usuarioId: result.recordset[0].UsuarioID }
    });

  } catch (err) {
    console.error('Error al crear usuario:', err);
    
    // Manejo de errores específicos de SQL Server
    if (err.number === 2627 || err.number === 2601) { // Duplicate key error
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre de usuario o email ya existe' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear usuario' 
    });
  }
}

// ============================================
// ACTUALIZAR USUARIO (sin SP - gestión directa)
// ============================================

/**
 * Actualiza un usuario existente
 * Params: usuarioId
 * Body: { nombreCompleto, email, telefono, puesto, activo }
 */
async function updateUsuario(req, res) {
  try {
    const { usuarioId } = req.params;
    const { nombreCompleto, email, telefono, puesto, activo } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ 
        success: false, 
        message: 'UsuarioID requerido' 
      });
    }

    // Validaciones básicas
    if (!nombreCompleto || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Campos requeridos: nombreCompleto, email' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de email inválido' 
      });
    }

    const pool = await getPool();
    
    // Verificar si el usuario existe
    const userExists = await pool.request()
      .input('UsuarioID', sql.Int, parseInt(usuarioId, 10))
      .query(`SELECT UsuarioID FROM UsuariosApp WHERE UsuarioID = @UsuarioID`);

    if (userExists.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Verificar si el email ya está en uso por otro usuario
    const emailCheck = await pool.request()
      .input('UsuarioID', sql.Int, parseInt(usuarioId, 10))
      .input('Email', sql.VarChar(100), email)
      .query(`
        SELECT UsuarioID 
        FROM UsuariosApp 
        WHERE Email = @Email AND UsuarioID != @UsuarioID
      `);

    if (emailCheck.recordset.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El email ya está en uso por otro usuario' 
      });
    }

    // Actualizar usuario
    await pool.request()
      .input('UsuarioID', sql.Int, parseInt(usuarioId, 10))
      .input('NombreCompleto', sql.VarChar(100), nombreCompleto)
      .input('Email', sql.VarChar(100), email)
      .input('Telefono', sql.VarChar(20), telefono || null)
      .input('Puesto', sql.VarChar(50), puesto || null)
      .input('Activo', sql.Bit, activo ? 1 : 0)
      .query(`
        UPDATE UsuariosApp
        SET NombreCompleto = @NombreCompleto,
            Email = @Email,
            Telefono = @Telefono,
            Puesto = @Puesto,
            Activo = @Activo,
            FechaModificacion = GETDATE()
        WHERE UsuarioID = @UsuarioID
      `);

    res.json({ 
      success: true, 
      message: 'Usuario actualizado correctamente' 
    });

  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar usuario' 
    });
  }
}

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================

/**
 * Cambia la contraseña de un usuario
 * Params: usuarioId
 * Body: { contrasena }
 */
async function cambiarContrasena(req, res) {
  try {
    const { usuarioId } = req.params;
    const { contrasena } = req.body;

    if (!usuarioId || !contrasena) {
      return res.status(400).json({ 
        success: false, 
        message: 'UsuarioID y contraseña requeridos' 
      });
    }

    // Validar longitud de contraseña
    if (contrasena.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

    const pool = await getPool();
    
    const result = await pool.request()
      .input('UsuarioID', sql.Int, parseInt(usuarioId, 10))
      .input('Contrasena', sql.VarChar(255), hashedPassword)
      .query(`
        UPDATE UsuariosApp
        SET Contrasena = @Contrasena,
            FechaModificacion = GETDATE()
        WHERE UsuarioID = @UsuarioID;
        
        SELECT @@ROWCOUNT AS FilasActualizadas;
      `);

    if (result.recordset[0].FilasActualizadas === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Contraseña actualizada correctamente' 
    });

  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error al cambiar contraseña' 
    });
  }
}

module.exports = {
  gestionUsuariosPermisos,
  createUsuario,
  updateUsuario,
  cambiarContrasena
};