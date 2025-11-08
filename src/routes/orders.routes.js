const express = require('express');
const router = express.Router();

// Asegúrate de que postOrders esté definido y exportado
const { getOrders, postOrders } = require('../controllers/orders.controllers');

// POST
router.post('/nuevo', postOrders); // ✅ Debe ser una función

// GET
router.get('/', getOrders);

module.exports = router;
