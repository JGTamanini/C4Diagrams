const express = require('express');
const projectController = require('../controllers/project.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', projectController.create);
router.get('/', projectController.list);
router.get('/:id', projectController.getById);
router.patch('/:id', projectController.update);
router.delete('/:id', projectController.remove);

module.exports = router;
