const express = require('express');
const aiController = require('../controllers/ai.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/status', aiController.status);

module.exports = router;
