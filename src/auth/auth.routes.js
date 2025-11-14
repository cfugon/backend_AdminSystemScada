// src/auth/auth.routes.js
const express = require('express');
const router = express.Router();

const { 
  login, 
  logout, 
  refreshToken 
} = require('./auth.controller');

console.log('✅ auth.routes.js cargado');

// 🧪 Ruta de prueba (GET - para probar en el navegador)
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Auth routes funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Rutas de autenticación
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);

module.exports = router;
