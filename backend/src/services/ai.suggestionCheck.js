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

// Nota: RF16 — o motor do RF17 confere cada sugestão da IA antes de ela chegar ao usuário. A sugestão é aplicada
// "de mentira" numa cópia do diagrama (nada é gravado nem devolvido ao editor): elemento fora do nível (RN08),
// relação repetida ou com elemento inexistente, ou elemento que já existe são descartados, com o motivo — a
// escalada para o Opus recebe a lista para não repetir. Elementos sugeridos no mesmo pedido podem ser ligados.
function checkSuggestions(level, data, suggestions) {
  if (!Array.isArray(suggestions)) return { kept: [], discarded: [] };

  const virtual = { nodes: [...data.nodes], edges: [...data.edges] };
  const byName = new Map();
  for (const node of data.nodes) if (!byName.has(normalizedName(node.data.label))) byName.set(normalizedName(node.data.label), node);
  const existingKeys = new Set(data.nodes.map((node) => `${node.type}:${normalizedName(node.data.label)}`));
  const existingIds = new Set(data.nodes.map((node) => node.id));

  const kept = [];
  const discarded = [];

  suggestions.slice(0, MAX_READ).forEach((raw, index) => {
    const item = {
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
    const discard = (problem) => discarded.push({ title: item.title ?? '(sem título)', name: item.name, problem });
    const resolve = (name) => (name ? byName.get(normalizedName(name)) : undefined);

    if (!item.title) return discard('Sugestão sem conteúdo.');

    switch (item.kind) {
      case 'add_element': {
        if (!item.name || !item.elementType) return discard('Elemento sem tipo ou sem nome.');
        if (!TYPES_WITH_TECHNOLOGY.includes(item.elementType)) item.technology = null;

        const key = `${item.elementType}:${normalizedName(item.name)}`;
        if (existingKeys.has(key)) return discard('Esse elemento já existe no diagrama.');

        const candidate = { id: `suggested-${index}`, type: item.elementType, position: { x: 0, y: 0 }, data: { label: item.name } };
        const [violation] = c4Validation
          .findViolations(level, { nodes: [...virtual.nodes, candidate], edges: virtual.edges })
          .filter((issue) => issue.nodeId === candidate.id);
        if (violation) return discard(violation.message);

        virtual.nodes.push(candidate);
        existingKeys.add(key);
        if (!byName.has(normalizedName(item.name))) byName.set(normalizedName(item.name), candidate);
        break;
      }
      case 'add_relationship': {
        const source = resolve(item.source);
        const target = resolve(item.target);
        const missing = source ? item.target : item.source;
        if (!source || !target) return discard(`"${missing ?? '?'}" não existe no diagrama.`);
        if (source.id === target.id) return discard('Uma relação liga dois elementos diferentes.');

        const candidate = { id: `suggested-edge-${index}`, source: source.id, target: target.id, label: item.description ?? 'Usa' };
        const [violation] = c4Validation
          .findViolations(level, { nodes: virtual.nodes, edges: [...virtual.edges, candidate] })
          .filter((issue) => issue.edgeId === candidate.id);
        if (violation) return discard(violation.message);

        virtual.edges.push(candidate);
        item.source = source.data.label;
        item.target = target.data.label;
        break;
      }
      case 'improve_text': {
        const target = resolve(item.targetName);
        if (!target || !existingIds.has(target.id)) return discard(`"${item.targetName ?? '?'}" não existe no diagrama.`);
        item.targetName = target.data.label;
        item.nodeId = target.id;
        break;
      }
      case 'note': {
        const target = resolve(item.targetName);
        const exists = target && existingIds.has(target.id);
        item.targetName = exists ? target.data.label : null;
        item.nodeId = exists ? target.id : null;
        break;
      }
      default:
        return discard('Tipo de sugestão desconhecido.');
    }

    kept.push(item);
  });

  return {
    kept: kept.slice(0, MAX_SUGGESTIONS).map((item, index) => ({ id: `s${index + 1}`, ...item })),
    discarded,
  };
}

module.exports = { checkSuggestions, MAX_SUGGESTIONS };
