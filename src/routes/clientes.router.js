// routes/clientes.routes.js
const express = require('express');
const router = express.Router();
const verifyAccess = require('../middleware/verifyAccess');

// ✅ Importar solo una vez
const { 
  getClientes, 
  postClientes, 
  getClienteById 
} = require('../controllers/clientes.controllers');

// ==========================================
// RUTAS DE CLIENTES
// ==========================================

// GET - Obtener todos los clientes con procedimiento almacenado
// Ejemplo: GET /api/clientes?op=1
router.get('/', verifyAccess, getClientes);

// GET - Obtener cliente por ID
// Ejemplo: GET /api/clientes/1
router.get('/:id', verifyAccess, getClienteById);

// POST - Crear, actualizar o eliminar clientes
// Ejemplo: POST /api/clientes
// Body: { op: 1, rtn: "...", nombre: "...", contacto: "...", telefono: "..." }
router.post('/', verifyAccess, postClientes);

module.exports = router;