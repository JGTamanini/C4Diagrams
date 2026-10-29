const diagramRepository = require('../repositories/diagram.repository');
const projectService = require('./project.service');
const { normalizeDiagramData } = require('./diagram.validation');
const c4Validation = require('./c4.validation');
const { LEVELS } = require('../domain/c4');
const { isUuid } = require('../domain/uuid');
const { ProjectNotFoundError } = require('../errors/project.errors');
const { InvalidDiagramLevelError, InvalidDiagramDataError } = require('../errors/diagram.errors');

function normalizeLevelData(level, rawData) {
  if (!LEVELS.includes(level)) throw new InvalidDiagramLevelError(level);
  return normalizeDiagramData(rawData);
}

// Nota: getProject valida o id e o dono — assim "projeto sem diagramas" (lista vazia) não se confunde com 404
async function listDiagrams(projectId, userId) {
  await projectService.getProject(projectId, userId);
  return diagramRepository.findAllByProject(projectId, userId);
}

function violationKey(violation) {
  return `${violation.code}:${violation.nodeId ?? violation.edgeId}`;
}

// Nota: um diagrama salvo antes de uma regra existir (ex.: duas relações entre o mesmo par) não pode ficar sem
// salvar para sempre — o salvamento automático de qualquer mudança falharia. Só o erro NOVO bloqueia; o que já
// estava salvo (mesmo id de elemento ou relação) passa, e continua aparecendo na validação até ser corrigido.
async function withoutPreexisting(projectId, userId, level, violations) {
  if (!isUuid(projectId)) throw new ProjectNotFoundError();

  const saved = await diagramRepository.findAllByProject(projectId, userId);
  const savedData = saved.find((diagram) => diagram.level === level)?.data;
  if (!savedData) return violations;

  const preexisting = new Set(c4Validation.findViolations(level, savedData).map(violationKey));
  return violations.filter((violation) => !preexisting.has(violationKey(violation)));
}

async function saveDiagram(projectId, userId, level, rawData) {
  const data = normalizeLevelData(level, rawData);

  // Nota: só os erros do motor de validação impedem salvar (RN08 e relação repetida); os avisos não (RN11).
  // O editor já evita os dois casos — aqui é a garantia do lado do servidor.
  const violations = c4Validation.findViolations(level, data);
  if (violations.length > 0) {
    const [newViolation] = await withoutPreexisting(projectId, userId, level, violations);
    if (newViolation) throw new InvalidDiagramDataError(newViolation.message);
  }

  // Nota: RN10 — só o nível com conteúdo existe no banco; esvaziar o canvas remove o registro do nível
  if (data.nodes.length === 0) {
    await projectService.getProject(projectId, userId);
    await diagramRepository.remove(projectId, userId, level);
    return null;
  }

  if (!isUuid(projectId)) throw new ProjectNotFoundError();

  const diagram = await diagramRepository.upsert(projectId, userId, level, data);
  if (!diagram) throw new ProjectNotFoundError();

  return diagram;
}

// Nota: RF17 — valida o estado atual do editor (ainda não salvo) sem gravar nada. Os outros níveis vêm do banco,
// para os avisos de coerência entre níveis; o nível validado usa sempre o estado enviado.
async function validateDiagram(projectId, userId, level, rawData) {
  const data = normalizeLevelData(level, rawData);

  await projectService.getProject(projectId, userId);
  const saved = await diagramRepository.findAllByProject(projectId, userId);

  const diagramsByLevel = Object.fromEntries(saved.map((diagram) => [diagram.level, diagram.data]));
  diagramsByLevel[level] = data;

  return c4Validation.validateDiagram(level, diagramsByLevel);
}

module.exports = { listDiagrams, saveDiagram, validateDiagram };
