// src/users/users.routes.js
const { Router } = require('express');
const { me } = require('./users.controller');
const { authRequired } = require('../auth/auth.middleware');

const router = Router();
router.get('/users/me', authRequired, me);

module.exports = router;
