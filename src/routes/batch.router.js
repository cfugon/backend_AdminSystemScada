const express = require('express');
const router = express.Router();

// Importamos el controlador de Kardex
const { getBatch } = require('../controllers/batch.controllers');

// Middleware para validar el token
const verifyAccess = require('../middleware/verifyAccess');

/**
 * Ruta principal de Kardex.
 * Pasa siempre por el middleware verifyAccess.
 * 
 * Ejemplo de uso desde el frontend:
 * GET /api/kardex?op=1&p1=valor1&p2=valor2...
 */
router.get('/', verifyAccess, getBatch);

module.exports = router;
