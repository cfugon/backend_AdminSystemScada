const express = require('express');
const router = express.Router();

// Importamos el controlador de Usuarios
const { 
  gestionUsuariosPermisos,
  createUsuario, 
  updateUsuario,
  cambiarContrasena
} = require('../controllers/usuarios.controller');

// Middleware para validar el token
const verifyAccess = require('../middleware/verifyAccess');

/**
 * ============================================
 * RUTA PRINCIPAL - STORED PROCEDURE
 * ============================================
 * Gestiona todas las operaciones de usuarios y permisos
 * mediante el procedimiento almacenado sp_GestionUsuariosPermisos
 * 
 * Todas pasan por el middleware verifyAccess
 */

// GET - Gestión de usuarios, permisos y módulos
// Ejemplos de uso:
//
// USUARIOS:
// GET /api/usuarios?op=5                        → Usuarios activos
// GET /api/usuarios?op=6                        → Todos los usuarios
// GET /api/usuarios?op=7&p1=1                   → Usuario por ID
// GET /api/usuarios?op=9&p1=1&p4=0              → Cambiar estado (desactivar)
// GET /api/usuarios?op=10&p1=1                  → Actualizar último acceso
//
// PERMISOS:
// GET /api/usuarios?op=1&p1=1                   → Permisos del usuario
// GET /api/usuarios?op=2&p1=1&p2=5&p3=LEER     → Verificar permiso específico
// GET /api/usuarios?op=3&p1=1&p2=5&p3=2&p4=1&p5=0  → Asignar permiso
// GET /api/usuarios?op=4&p1=1                   → Menú del usuario
// GET /api/usuarios?op=11&p1=1&p2=5             → Eliminar permiso de módulo
// GET /api/usuarios?op=12&p1=1                  → Eliminar todos los permisos
//
// MÓDULOS:
// GET /api/usuarios?op=8                        → Módulos activos
router.get('/', verifyAccess, gestionUsuariosPermisos);


/**
 * ============================================
 * RUTAS ESPECÍFICAS - SIN STORED PROCEDURE
 * ============================================
 * Operaciones que requieren lógica adicional
 * (validaciones, encriptación, etc.)
 */

// POST - Crear nuevo usuario
// Body: { nombreUsuario, nombreCompleto, email, contrasena, telefono, puesto, activo }
router.post('/create', verifyAccess, createUsuario);

// PUT - Actualizar usuario existente
// Params: usuarioId
// Body: { nombreCompleto, email, telefono, puesto, activo }
router.put('/:usuarioId', verifyAccess, updateUsuario);

// PUT - Cambiar contraseña de usuario
// Params: usuarioId
// Body: { contrasena }
router.put('/:usuarioId/password', verifyAccess, cambiarContrasena);

module.exports = router;