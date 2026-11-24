const { TYPES_WITH_TECHNOLOGY } = require('../domain/c4');
const c4Validation = require('./c4.validation');

// Sugestões devolvidas ao usuário (as primeiras, já na ordem de importância pedida à IA) e quantas são lidas
const MAX_SUGGESTIONS = 8;
const MAX_READ = 12;

// Tamanhos máximos dos textos: os mesmos do formulário do elemento no editor (nome 60, descrição 200)
const LIMITS = { title: 160, reason: 300, name: 60, description: 200, technology: 100 };

function text(value, max) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, max) || null;
}

function normalizedName(name) {
  return name.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

// Resposta da IA → sugestão com os campos esperados, textos limpos e cortados nos tamanhos do editor
function readItem(raw) {
  return {
    kind: raw?.kind,
    title: text(raw?.title, LIMITS.title),
    reason: text(raw?.reason, LIMITS.reason),
    elementType: typeof raw?.elementType === 'string' ? raw.elementType : null,
    name: text(raw?.name, LIMITS.name),
    description: text(raw?.description, LIMITS.description),
    technology: text(raw?.technology, LIMITS.technology),
    source: text(raw?.source, LIMITS.name),
    target: text(raw?.target, LIMITS.name),
    targetName: text(raw?.targetName, LIMITS.name),
    nodeId: null,
  };
}

// Cópia do diagrama onde as sugestões são aplicadas "de mentira", com os índices por nome, tipo+nome e id
function createVirtualDiagram(level, data) {
  const byName = new Map();
  for (const node of data.nodes) {
    const name = normalizedName(node.data.label);
    if (!byName.has(name)) byName.set(name, node);
  }
  return {
    level,
    nodes: [...data.nodes],
    edges: [...data.edges],
    byName,
    existingKeys: new Set(data.nodes.map((node) => `${node.type}:${normalizedName(node.data.label)}`)),
    existingIds: new Set(data.nodes.map((node) => node.id)),
    resolve: (name) => (name ? byName.get(normalizedName(name)) : undefined),
  };
}

// Cada tipo confere a sugestão na cópia: devolve o problema (a sugestão é descartada) ou null (fica), e pode ajustar
// o item (nomes como estão no diagrama, id do elemento citado) e a cópia (o que foi sugerido pode ser ligado depois)
function checkElement(item, index, diagram) {
  if (!item.name || !item.elementType) return 'Elemento sem tipo ou sem nome.';
  if (!TYPES_WITH_TECHNOLOGY.includes(item.elementType)) item.technology = null;

  const name = normalizedName(item.name);
  const key = `${item.elementType}:${name}`;
  if (diagram.existingKeys.has(key)) return 'Esse elemento já existe no diagrama.';

  const candidate = { id: `suggested-${index}`, type: item.elementType, position: { x: 0, y: 0 }, data: { label: item.name } };
  const violation = c4Validation
    .findViolations(diagram.level, { nodes: [...diagram.nodes, candidate], edges: diagram.edges })
    .find((issue) => issue.nodeId === candidate.id);
  if (violation) return violation.message;

  diagram.nodes.push(candidate);
  diagram.existingKeys.add(key);
  if (!diagram.byName.has(name)) diagram.byName.set(name, candidate);
  return null;
}

function checkRelationship(item, index, diagram) {
  const source = diagram.resolve(item.source);
  const target = diagram.resolve(item.target);
  if (!source || !target) return `"${(source ? item.target : item.source) ?? '?'}" não existe no diagrama.`;
  if (source.id === target.id) return 'Uma relação liga dois elementos diferentes.';

  const candidate = { id: `suggested-edge-${index}`, source: source.id, target: target.id, label: item.description ?? 'Usa' };
  const violation = c4Validation
    .findViolations(diagram.level, { nodes: diagram.nodes, edges: [...diagram.edges, candidate] })
    .find((issue) => issue.edgeId === candidate.id);
  if (violation) return violation.message;

  diagram.edges.push(candidate);
  item.source = source.data.label;
  item.target = target.data.label;
  return null;
}

// Elemento citado que já estava no diagrama (não um sugerido no mesmo pedido)
function existingTarget(item, diagram) {
  const target = diagram.resolve(item.targetName);
  return target && diagram.existingIds.has(target.id) ? target : null;
}

function checkTextImprovement(item, index, diagram) {
  const target = existingTarget(item, diagram);
  if (!target) return `"${item.targetName ?? '?'}" não existe no diagrama.`;
  item.targetName = target.data.label;
  item.nodeId = target.id;
  return null;
}

// Observação fica sempre; só é ligada ao elemento quando ele existe
function checkNote(item, index, diagram) {
  const target = existingTarget(item, diagram);
  item.targetName = target?.data.label ?? null;
  item.nodeId = target?.id ?? null;
  return null;
}

// Map, e não objeto: um tipo como "toString" não encontra nada herdado
const CHECKS = new Map([
  ['add_element', checkElement],
  ['add_relationship', checkRelationship],
  ['improve_text', checkTextImprovement],
  ['note', checkNote],
]);

function problemOf(item, index, diagram) {
  if (!item.title) return 'Sugestão sem conteúdo.';
  const check = CHECKS.get(item.kind);
  return check ? check(item, index, diagram) : 'Tipo de sugestão desconhecido.';
}

// Nota: RF16 — o motor do RF17 confere cada sugestão da IA antes de ela chegar ao usuário. A sugestão é aplicada
// "de mentira" numa cópia do diagrama (nada é gravado nem devolvido ao editor): elemento fora do nível (RN08),
// relação repetida ou com elemento inexistente, ou elemento que já existe são descartados, com o motivo — a
// escalada para o Opus recebe a lista para não repetir. Elementos sugeridos no mesmo pedido podem ser ligados.
function checkSuggestions(level, data, suggestions) {
  if (!Array.isArray(suggestions)) return { kept: [], discarded: [] };

  const diagram = createVirtualDiagram(level, data);
  const kept = [];
  const discarded = [];

  suggestions.slice(0, MAX_READ).forEach((raw, index) => {
    const item = readItem(raw);
    const problem = problemOf(item, index, diagram);
    if (problem) discarded.push({ title: item.title ?? '(sem título)', name: item.name, problem });
    else kept.push(item);
  });

  return {
    kept: kept.slice(0, MAX_SUGGESTIONS).map((item, index) => ({ id: `s${index + 1}`, ...item })),
    discarded,
  };
}

module.exports = { checkSuggestions, MAX_SUGGESTIONS };
