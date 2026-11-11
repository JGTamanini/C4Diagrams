const diagramService = require('../services/diagram.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { InvalidDiagramDataError } = require('../errors/diagram.errors');

const VERSION_PATTERN = /^(?:W\/)?"?(\d+)"?$/;

// Nota: issue #74 — a versão do nível que a aba conhece vem nos cabeçalhos HTTP de concorrência otimista:
// If-Match: "3" (grava só se o nível ainda está na versão 3); If-None-Match: * (cria só se o nível ainda não existe).
// Sem nenhum dos dois, undefined: grava por cima.
function expectedVersionFrom(req) {
  const ifMatch = req.get('If-Match');
  if (ifMatch !== undefined) {
    const match = VERSION_PATTERN.exec(ifMatch.trim());
    if (!match) throw new InvalidDiagramDataError('Versão do diagrama inválida.');
    return Number(match[1]);
  }
  if (req.get('If-None-Match')?.trim() === '*') return null;
  return undefined;
}

const list = asyncHandler(async (req, res) => {
  const diagrams = await diagramService.listDiagrams(req.params.projectId, req.user.id);
  res.status(200).json(diagrams);
});

// Nota: canvas vazio remove o nível (RN10) — sem conteúdo a devolver, responde 204
const save = asyncHandler(async (req, res) => {
  const diagram = await diagramService.saveDiagram(
    req.params.projectId,
    req.user.id,
    req.params.level,
    req.body,
    expectedVersionFrom(req)
  );

  if (!diagram) {
    res.status(204).end();
    return;
  }

  res.status(200).json(diagram);
});

// Nota: RF17 — o editor envia o estado atual (ainda não salvo) e recebe erros e avisos; nada é gravado
const validate = asyncHandler(async (req, res) => {
  const issues = await diagramService.validateDiagram(req.params.projectId, req.user.id, req.params.level, req.body);
  res.status(200).json({ issues });
});

module.exports = { list, save, validate };
