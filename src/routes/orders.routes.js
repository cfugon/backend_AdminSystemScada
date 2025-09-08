const express = require('express');
const router = express.Router();

// Importamos el controlador de Kardex
const { getRecetas, getOrders } = require('../controllers/orders.controllers');

// Middleware para validar el token
const verifyAccess = require('../middleware/verifyAccess');

/**
 * Ruta principal de Kardex.
 * Pasa siempre por el middleware verifyAccess.
 * 
 * Ejemplo de uso desde el frontend:
 * GET /api/kardex?op=1&p1=valor1&p2=valor2...
 */
router.get('/', verifyAccess, getOrders);

module.exports = router;
