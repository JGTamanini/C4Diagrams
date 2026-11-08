const diagramRepository = require('../repositories/diagram.repository');
const projectService = require('./project.service');
const { normalizeDiagramData } = require('./diagram.validation');
const c4Validation = require('./c4.validation');
const { LEVELS } = require('../domain/c4');
const { isUuid } = require('../domain/uuid');
const { ProjectNotFoundError } = require('../errors/project.errors');
const {
  InvalidDiagramLevelError,
  InvalidDiagramDataError,
  DiagramVersionConflictError,
} = require('../errors/diagram.errors');

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

// A gravação condicional não aconteceu: ou o projeto não é do usuário (404), ou outra aba mudou o nível (conflito)
async function conflictOrNotFound(projectId, userId, level) {
  await projectService.getProject(projectId, userId);
  return new DiagramVersionConflictError(await diagramRepository.findVersion(projectId, userId, level));
}

// Esvaziar o nível (RN10), conferindo a versão quando a aba informa uma
async function removeLevel(projectId, userId, level, expectedVersion) {
  await projectService.getProject(projectId, userId);

  if (expectedVersion === undefined) {
    await diagramRepository.remove(projectId, userId, level);
    return;
  }
  if (expectedVersion !== null && (await diagramRepository.removeIfVersion(projectId, userId, level, expectedVersion))) {
    return;
  }
  // Nada foi apagado: se o nível não existe, o resultado é o que a aba queria; se existe, outra aba o gravou
  const currentVersion = await diagramRepository.findVersion(projectId, userId, level);
  if (currentVersion !== null) throw new DiagramVersionConflictError(currentVersion);
}

// Nota: issue #74 — expectedVersion é a versão do nível que a aba conhece: um número, ou null quando a aba acha que o
// nível ainda não existe. A gravação só acontece se o banco ainda estiver nessa versão; senão, conflito, e nada é
// sobrescrito. Sem versão (undefined), grava por cima, como antes da concorrência otimista.
async function saveDiagram(projectId, userId, level, rawData, expectedVersion) {
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
    await removeLevel(projectId, userId, level, expectedVersion);
    return null;
  }

  if (!isUuid(projectId)) throw new ProjectNotFoundError();

  if (expectedVersion === undefined) {
    const diagram = await diagramRepository.upsert(projectId, userId, level, data);
    if (!diagram) throw new ProjectNotFoundError();
    return diagram;
  }

  const diagram =
    expectedVersion === null
      ? await diagramRepository.insertIfAbsent(projectId, userId, level, data)
      : await diagramRepository.updateIfVersion(projectId, userId, level, data, expectedVersion);
  if (!diagram) throw await conflictOrNotFound(projectId, userId, level);

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
