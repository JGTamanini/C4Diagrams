const diagramService = require('../services/diagram.service');
const asyncHandler = require('../middlewares/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const diagrams = await diagramService.listDiagrams(req.params.projectId, req.user.id);
  res.status(200).json(diagrams);
});

// Nota: canvas vazio remove o nível (RN10) — sem conteúdo a devolver, responde 204
const save = asyncHandler(async (req, res) => {
  const diagram = await diagramService.saveDiagram(req.params.projectId, req.user.id, req.params.level, req.body);

  if (!diagram) {
    res.status(204).end();
    return;
  }

  res.status(200).json(diagram);
});

module.exports = { list, save };
