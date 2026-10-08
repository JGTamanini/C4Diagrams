const diagramRepository = require('../repositories/diagram.repository');
const projectService = require('./project.service');
const { normalizeDiagramData } = require('./diagram.validation');
const { LEVELS } = require('../domain/c4');
const { isUuid } = require('../domain/uuid');
const { ProjectNotFoundError } = require('../errors/project.errors');
const { InvalidDiagramLevelError } = require('../errors/diagram.errors');

// Nota: getProject valida o id e o dono — assim "projeto sem diagramas" (lista vazia) não se confunde com 404
async function listDiagrams(projectId, userId) {
  await projectService.getProject(projectId, userId);
  return diagramRepository.findAllByProject(projectId, userId);
}

async function saveDiagram(projectId, userId, level, rawData) {
  if (!LEVELS.includes(level)) throw new InvalidDiagramLevelError(level);

  const data = normalizeDiagramData(rawData);

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

module.exports = { listDiagrams, saveDiagram };
