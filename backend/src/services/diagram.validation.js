const { NODE_TYPES, TYPES_WITH_TECHNOLOGY } = require('../domain/c4');
const { InvalidDiagramDataError } = require('../errors/diagram.errors');

const MAX_NODES = 200;
const MAX_EDGES = 400;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const TECHNOLOGY_MAX_LENGTH = 100;

function fail(message) {
  throw new InvalidDiagramDataError(message);
}

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function checkLength(prefix, field, value, max) {
  if (value.length > max) fail(`${prefix}: ${field} deve ter no máximo ${max} caracteres.`);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

// Nota: devolve uma cópia só com os campos conhecidos — o estado interno do React Flow
// (selected, measured, dragging...) não vai para o banco
function normalizeNode(rawNode, seenIds) {
  const id = trimmed(rawNode?.id);
  if (!id) fail('Todo elemento deve ter um id.');

  const prefix = `Elemento "${id}"`;
  if (seenIds.has(id)) fail(`${prefix}: id repetido no diagrama.`);
  seenIds.add(id);

  const { type, position, data } = rawNode;
  if (!NODE_TYPES.includes(type)) fail(`${prefix}: tipo "${type}" não é um tipo C4 suportado.`);
  if (!isFiniteNumber(position?.x) || !isFiniteNumber(position?.y)) fail(`${prefix}: posição inválida.`);

  const label = trimmed(data?.label);
  if (!label) fail(`${prefix}: o título é obrigatório.`);
  checkLength(prefix, 'o título', label, TITLE_MAX_LENGTH);

  const normalizedData = { label };

  const description = trimmed(data?.description);
  if (description) {
    checkLength(prefix, 'a descrição', description, DESCRIPTION_MAX_LENGTH);
    normalizedData.description = description;
  }

  const technology = trimmed(data?.technology);
  if (technology) {
    if (!TYPES_WITH_TECHNOLOGY.includes(type)) fail(`${prefix}: o tipo "${type}" não possui tecnologia.`);
    checkLength(prefix, 'a tecnologia', technology, TECHNOLOGY_MAX_LENGTH);
    normalizedData.technology = technology;
  }

  return { id, type, position: { x: position.x, y: position.y }, data: normalizedData };
}

function normalizeEdge(rawEdge, nodeIds, seenIds) {
  const id = trimmed(rawEdge?.id);
  if (!id) fail('Toda conexão deve ter um id.');

  const prefix = `Conexão "${id}"`;
  if (seenIds.has(id)) fail(`${prefix}: id repetido no diagrama.`);
  seenIds.add(id);

  const { source, target } = rawEdge;
  if (!nodeIds.has(source) || !nodeIds.has(target)) {
    fail(`${prefix}: deve ligar dois elementos existentes no diagrama.`);
  }
  if (source === target) fail(`${prefix}: não pode ligar um elemento a ele mesmo.`);

  // Notação oficial: toda conexão deve ter rótulo
  const label = trimmed(rawEdge.label);
  if (!label) fail(`${prefix}: o rótulo é obrigatório.`);
  checkLength(prefix, 'o rótulo', label, TITLE_MAX_LENGTH);

  const normalizedEdge = { id, source, target, label };

  const technology = trimmed(rawEdge.technology);
  if (technology) {
    checkLength(prefix, 'a tecnologia', technology, TECHNOLOGY_MAX_LENGTH);
    normalizedEdge.technology = technology;
  }

  return normalizedEdge;
}

// Nota: valida só a estrutura do documento; a compatibilidade tipo × nível (RN08) é do motor de validação C4
function normalizeDiagramData(data) {
  if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) {
    fail('O diagrama deve conter as listas "nodes" e "edges".');
  }
  if (data.nodes.length > MAX_NODES) fail(`O diagrama pode ter no máximo ${MAX_NODES} elementos.`);
  if (data.edges.length > MAX_EDGES) fail(`O diagrama pode ter no máximo ${MAX_EDGES} conexões.`);

  const seenNodeIds = new Set();
  const nodes = data.nodes.map((rawNode) => normalizeNode(rawNode, seenNodeIds));

  const seenEdgeIds = new Set();
  const edges = data.edges.map((rawEdge) => normalizeEdge(rawEdge, seenNodeIds, seenEdgeIds));

  return { nodes, edges };
}

module.exports = { normalizeDiagramData };
