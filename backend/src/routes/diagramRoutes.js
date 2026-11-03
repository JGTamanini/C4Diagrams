const express = require('express');
const diagramController = require('../controllers/diagram.controller');
const aiController = require('../controllers/ai.controller');
const authenticate = require('../middlewares/authenticate');

// Nota: mergeParams expõe o :projectId da rota pai (/api/projects/:projectId/diagrams)
const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', diagramController.list);
router.put('/:level', diagramController.save);
router.post('/:level/validate', diagramController.validate);
// RF16: sugestões da IA para o nível (sob pedido; nada é gravado)
router.post('/:level/suggestions', aiController.suggest);

module.exports = router;
