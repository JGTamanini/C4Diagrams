const express = require('express');
const projectController = require('../controllers/project.controller');
const shareController = require('../controllers/projectShare.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', projectController.create);
router.post('/import', projectController.importFromFile);
router.get('/', projectController.list);
router.get('/:id', projectController.getById);
router.patch('/:id', projectController.update);
router.delete('/:id', projectController.remove);
// Link de visualização do projeto (só leitura), gerenciado pelo dono
router.get('/:id/share', shareController.get);
router.post('/:id/share', shareController.create);
router.delete('/:id/share', shareController.revoke);

module.exports = router;
