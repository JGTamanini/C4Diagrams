const express = require('express');
const diagramController = require('../controllers/diagram.controller');
const authenticate = require('../middlewares/authenticate');

// Nota: mergeParams expõe o :projectId da rota pai (/api/projects/:projectId/diagrams)
const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', diagramController.list);
router.put('/:level', diagramController.save);

module.exports = router;
