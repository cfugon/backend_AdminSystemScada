const express = require('express');
const router = express.Router();
const { getProyectos } = require('../controllers/proyectos.controllers');
const verifyAccess = require('../middleware/verifyAccess');



router.get('/', verifyAccess, getProyectos);

module.exports = router;