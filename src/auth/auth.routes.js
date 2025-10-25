// src/auth/auth.routes.js
const { Router } = require('express');
const { register, login, logout, refreshToken, loginClientes } = require('./auth.controller');

const router = Router();

router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/refresh', refreshToken);
router.post('/auth/loginclient', loginClientes);

module.exports = router;
