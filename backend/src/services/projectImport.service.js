const projectRepository = require('../repositories/project.repository');
const { normalizeName, normalizeDescription } = require('./project.service');
const { normalizeDiagramData } = require('./diagram.validation');
const c4Validation = require('./c4.validation');
const { LEVELS, LEVEL_NAMES } = require('../domain/c4');
const { InvalidImportFileError } = require('../errors/project.errors');
const { InvalidDiagramDataError } = require('../errors/diagram.errors');

// Identificação do arquivo exportado pelo editor (RF21). A versão muda se o formato mudar de forma incompatível
const PROJECT_FILE_FORMAT = 'c4diagrams';
const PROJECT_FILE_VERSION = 1;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// O mesmo que o salvamento confere (estrutura e erros do motor C4), com o nível na mensagem
function normalizeLevel(level, rawData) {
  const where = `Nível ${LEVEL_NAMES[level]}`;
  let data;
  try {
    data = normalizeDiagramData(rawData);
  } catch (err) {
    if (err instanceof InvalidDiagramDataError) throw new InvalidImportFileError(`${where}: ${err.message}`);
    throw err;
  }

  const [violation] = c4Validation.findViolations(level, data);
  if (violation) throw new InvalidImportFileError(`${where}: ${violation.message}`);
  return data;
}

// Nota: RF21 (importar um projeto exportado) e RF15 (projeto de exemplo, que é a importação de um arquivo que vem
// com o sistema). Sempre cria um projeto NOVO do usuário — nunca sobrescreve. Nível vazio não é gravado (RN10).
async function importProject(userId, file) {
  if (file?.format !== PROJECT_FILE_FORMAT || file?.version !== PROJECT_FILE_VERSION) {
    throw new InvalidImportFileError('O arquivo não é um projeto do C4Diagrams (formato ou versão desconhecidos).');
  }

  const rawDiagrams = file.diagrams ?? {};
  if (!isPlainObject(rawDiagrams)) throw new InvalidImportFileError('Os diagramas do arquivo estão num formato inválido.');

  const unknown = Object.keys(rawDiagrams).find((level) => !LEVELS.includes(level));
  if (unknown) throw new InvalidImportFileError(`Nível "${unknown}" desconhecido. Use "context", "container" ou "component".`);

  const project = { name: normalizeName(file.project?.name), description: normalizeDescription(file.project?.description) };
  const diagrams = LEVELS.filter((level) => rawDiagrams[level] !== undefined)
    .map((level) => ({ level, data: normalizeLevel(level, rawDiagrams[level]) }))
    .filter(({ data }) => data.nodes.length > 0);

  return projectRepository.createWithDiagrams(userId, project, diagrams);
}

module.exports = { importProject, PROJECT_FILE_FORMAT, PROJECT_FILE_VERSION };
