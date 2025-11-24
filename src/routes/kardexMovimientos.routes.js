// src/routes/kardexMovimientos.routes.js
const express = require('express');
const router = express.Router();

// Importar controladores
const { 
  getKardexMovimientos,
  crearKardexMovimiento,
  actualizarKardexMovimiento,
  eliminarKardexMovimiento
} = require('../controllers/kardexMovimientos.controller');

// Middleware para validar el token
const verifyAccess = require('../middleware/verifyAccess');

// ========================================
// 📍 RUTAS DE KARDEX MOVIMIENTOS
// ========================================

// 📊 GET - Obtener registros de kardex
router.get('/', verifyAccess, getKardexMovimientos);

// 💾 POST - Crear nuevo registro
router.post('/', verifyAccess, crearKardexMovimiento);

// 🔄 PUT - Actualizar registro existente
router.put('/:id', verifyAccess, actualizarKardexMovimiento);

// 🗑️ DELETE - Eliminar registro
router.delete('/:id', verifyAccess, eliminarKardexMovimiento);

module.exports = router;