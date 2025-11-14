// create-test-user.js
const bcrypt = require('bcrypt');
const { getPool, sql } = require('./src/db');

async function createTestUser() {
  try {
    const username = 'admin';
    const password = '123456';
    const fullName = 'Administrador del Sistema';
    const email = 'admin@sistema.com';

    // Generar hash
    const hash = await bcrypt.hash(password, 10);
    console.log('📝 Hash generado:', hash);

    const pool = await getPool();

    // Verificar si el usuario existe
    const check = await pool.request()
      .input('username', sql.NVarChar(100), username)
      .query('SELECT UsuarioID FROM UsuariosApp WHERE NombreUsuario = @username');

    if (check.recordset.length > 0) {
      console.log('⚠️  Usuario ya existe, actualizando contraseña...');
      
      await pool.request()
        .input('username', sql.NVarChar(100), username)
        .input('hash', sql.NVarChar(255), hash)
        .query('UPDATE UsuariosApp SET Contrasena = @hash WHERE NombreUsuario = @username');
      
      console.log('✅ Contraseña actualizada');
    } else {
      // Insertar nuevo usuario
      const result = await pool.request()
        .input('nombreUsuario', sql.NVarChar(50), username)
        .input('nombreCompleto', sql.NVarChar(100), fullName)
        .input('email', sql.NVarChar(100), email)
        .input('contrasena', sql.NVarChar(255), hash)
        .query(`
          INSERT INTO UsuariosApp (
            NombreUsuario, 
            NombreCompleto, 
            Email, 
            Contrasena, 
            Activo, 
            FechaCreacion
          )
          OUTPUT Inserted.UsuarioID, Inserted.NombreUsuario
          VALUES (
            @nombreUsuario, 
            @nombreCompleto, 
            @email, 
            @contrasena, 
            1, 
            GETDATE()
          )
        `);

      console.log('✅ Usuario creado:', result.recordset[0]);
    }

    // Asignar todos los permisos al admin
    const usuarioId = check.recordset.length > 0 
      ? check.recordset[0].UsuarioID 
      : (await pool.request()
          .input('username', sql.NVarChar(100), username)
          .query('SELECT UsuarioID FROM UsuariosApp WHERE NombreUsuario = @username')
        ).recordset[0].UsuarioID;

    // Obtener todos los módulos
    const modulos = await pool.request()
      .query('SELECT ModuloID FROM Modulos WHERE Activo = 1');

    // Asignar permisos
    for (const modulo of modulos.recordset) {
      await pool.request()
        .input('usuarioId', sql.Int, usuarioId)
        .input('moduloId', sql.Int, modulo.ModuloID)
        .query(`
          MERGE Permisos AS target
          USING (SELECT @usuarioId AS UsuarioID, @moduloId AS ModuloID) AS source
          ON (target.UsuarioID = source.UsuarioID AND target.ModuloID = source.ModuloID)
          WHEN MATCHED THEN
            UPDATE SET PuedeLeer = 1, PuedeEscribir = 1
          WHEN NOT MATCHED THEN
            INSERT (UsuarioID, ModuloID, PuedeLeer, PuedeEscribir)
            VALUES (@usuarioId, @moduloId, 1, 1);
        `);
    }

    console.log('✅ Permisos asignados');
    console.log('\n📋 Credenciales de prueba:');
    console.log('   Username:', username);
    console.log('   Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();