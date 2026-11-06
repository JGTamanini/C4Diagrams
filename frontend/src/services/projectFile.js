import { toApi } from './diagramMapper';
import { LEVELS, LEVEL_IDS, isAllowedInLevel } from '../constants/c4Notation';

// Mesma identificação que o backend confere na importação (projectImport.service.js)
export const PROJECT_FILE_FORMAT = 'c4diagrams';
export const PROJECT_FILE_VERSION = 1;

// Nota: RF21 — o projeto inteiro num arquivo (Docs-as-Code): nome, descrição e os níveis com conteúdo, no mesmo
// formato da API de diagramas. Pode ser versionado num repositório e importado de volta como um projeto novo.
export function buildProjectFile(project, diagramsByLevel) {
  const diagrams = Object.fromEntries(
    LEVEL_IDS.filter((level) => diagramsByLevel[level]?.nodes.length > 0).map((level) => [level, toApi(diagramsByLevel[level])])
  );

  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    project: { name: project.name, description: project.description ?? null },
    diagrams,
  };
}

// Nome de arquivo seguro em qualquer sistema: sem acentos, espaços ou símbolos
export function fileNameFor(projectName) {
  const slug = projectName
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return `${slug || 'projeto'}.c4diagrams.json`;
}

export function downloadProjectFile(project, diagramsByLevel) {
  const content = JSON.stringify(buildProjectFile(project, diagramsByLevel), null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileNameFor(project.name);
  anchor.click();
  URL.revokeObjectURL(url);
}

function hasErrors(level, { nodes, edges }) {
  if (nodes.some((node) => !isAllowedInLevel(level, node.type))) return true;
  const pairs = edges.map((edge) => [edge.source, edge.target].sort((a, b) => a.localeCompare(b)).join('<->'));
  return new Set(pairs).size < pairs.length;
}

// Níveis com os erros que a importação recusa (elemento fora do nível, relação repetida). O editor já impede criá-los,
// mas um diagrama salvo antes dessas regras pode tê-los, e o arquivo exportado não voltaria a ser importado
export function levelsWithErrors(diagramsByLevel) {
  return LEVELS.filter((level) => hasErrors(level.id, diagramsByLevel[level.id])).map((level) => level.label);
}

// Conteúdo do arquivo escolhido para importar; o backend confere o formato e cada nível
export async function readProjectFile(file) {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('O arquivo escolhido não é um projeto do C4Diagrams (JSON inválido).');
  }
}
