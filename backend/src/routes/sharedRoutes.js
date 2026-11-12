const express = require('express');
const shareController = require('../controllers/projectShare.controller');
const authenticate = require('../middlewares/authenticate');

// Nota: abrir um projeto pelo link de visualização (só leitura). Exige login, mas não ser o dono.
const router = express.Router();

router.use(authenticate);

router.get('/:token', shareController.open);

module.exports = router;
