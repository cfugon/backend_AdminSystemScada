const express = require('express');
const router = express.Router();
const { getProyectos, postProyectos } = require('../controllers/proyectos.controllers');
const verifyAccess = require('../middleware/verifyAccess');



router.get('/', verifyAccess, getProyectos);
router.post('/nuevo', verifyAccess, postProyectos); // ✅ Esta es la ruta Angular

module.exports = router;