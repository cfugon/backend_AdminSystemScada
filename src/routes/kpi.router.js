const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/kpi.controllers');
const verifyToken = require('../middleware/verifyAccess');
const verifyAccess = require('../middleware/verifyAccess');



router.get('/', verifyAccess, getDashboard);

module.exports = router;