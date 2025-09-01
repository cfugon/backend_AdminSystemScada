const express = require('express');
const router = express.Router();
const { getClientes } = require('../controllers/clientes.controllers');
const verifyToken = require('../middleware/verifyAccess');
const verifyAccess = require('../middleware/verifyAccess');



router.get('/', verifyAccess, getClientes);

module.exports = router;