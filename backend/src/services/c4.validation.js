const { LEVEL_ELEMENTS, LEVEL_NAMES, NODE_TYPE_NAMES, TYPES_WITH_TECHNOLOGY } = require('../domain/c4');

// Nota: motor de validação C4 (RFC 5.3, RF17). Recebe diagramas já normalizados (diagram.validation.js) e devolve
// a lista de problemas encontrados, sem lançar nada:
// - erros ("error"): o que não pode ser salvo — elemento fora do nível (RN08) e mais de uma relação entre o mesmo
//   par, em qualquer sentido (sem "via dupla");
// - avisos ("warning"): inconsistências a sinalizar sem bloquear a edição (RN11), dentro do nível e entre níveis.
// Cada item traz um "code" estável (o frontend destaca o elemento por ele) e a mensagem em português.

// O que cada nível detalha (o elemento em foco) e o aviso quando ele falta no próprio nível
const LEVEL_FOCUS = {
  context: {
    types: ['c4-system'],
    code: 'CONTEXT_WITHOUT_SYSTEM',
    message: 'O diagrama de Contexto não tem um Sistema de Software: ele é o foco do diagrama.',
  },
  // Banco de dados também é um container no C4
  container: {
    types: ['c4-container', 'c4-container-db'],
    code: 'CONTAINER_LEVEL_WITHOUT_CONTAINER',
    message: 'O diagrama de Containers não tem nenhum container (aplicação ou banco de dados).',
  },
  component: {
    types: ['c4-component'],
    code: 'COMPONENT_LEVEL_WITHOUT_COMPONENT',
    message: 'O diagrama de Componentes não tem nenhum componente.',
  },
};

// Coerência entre níveis: o nível de detalhe aprofunda um elemento do nível acima (focus), e os elementos ao
// redor (mirrored) devem ser os mesmos de lá
const PARENT_LEVEL = {
  container: {
    level: 'context',
    focus: 'c4-system',
    focusName: 'um Sistema de Software',
    detailedName: 'um sistema',
    mirrored: ['c4-person', 'c4-system-external'],
  },
  component: {
    level: 'container',
    focus: 'c4-container',
    focusName: 'um Container',
    detailedName: 'um container',
    mirrored: ['c4-person', 'c4-system-external', 'c4-container', 'c4-container-db'],
  },
};

const LEVELS_WITH_TECHNOLOGY_ON_RELATIONSHIPS = new Set(['container', 'component']);

function issue(severity, code, message, target = {}) {
  return { code, severity, ...target, message };
}

// Cada nível guarda cópias próprias dos elementos (sem id em comum), então a correspondência é por tipo e nome,
// ignorando maiúsculas e espaços extras
function matchKey(node) {
  return `${node.type}:${node.data.label.trim().toLowerCase().replaceAll(/\s+/g, ' ')}`;
}

function describeNode(node) {
  return `"${node.data.label}" (${NODE_TYPE_NAMES[node.type]})`;
}

function labelsById(data) {
  return new Map(data.nodes.map((node) => [node.id, node.data.label]));
}

function findViolations(level, data) {
  const issues = [];
  const allowed = LEVEL_ELEMENTS[level];

  for (const node of data.nodes) {
    if (!allowed.includes(node.type)) {
      issues.push(
        issue('error', 'ELEMENT_NOT_ALLOWED_IN_LEVEL', `${describeNode(node)} não pertence ao diagrama de ${LEVEL_NAMES[level]}.`, {
          nodeId: node.id,
        })
      );
    }
  }

  // O par é o mesmo nos dois sentidos: A → B e B → A contam como uma relação só
  const labels = labelsById(data);
  const seen = new Set();
  for (const edge of data.edges) {
    const key = [edge.source, edge.target].sort().join('<->');
    if (seen.has(key)) {
      issues.push(
        issue(
          'error',
          'DUPLICATE_RELATIONSHIP',
          `Já existe uma relação entre "${labels.get(edge.source)}" e "${labels.get(edge.target)}". Use uma só relação entre o mesmo par.`,
          { edgeId: edge.id }
        )
      );
    }
    seen.add(key);
  }

  return issues;
}

function levelWarnings(level, data) {
  const warnings = [];
  const focus = LEVEL_FOCUS[level];

  if (!data.nodes.some((node) => focus.types.includes(node.type))) {
    warnings.push(issue('warning', focus.code, focus.message));
  }
  if (level === 'context' && !data.nodes.some((node) => node.type === 'c4-person')) {
    warnings.push(
      issue('warning', 'CONTEXT_WITHOUT_PERSON', 'O diagrama de Contexto não mostra quem usa o sistema: nenhuma Pessoa.')
    );
  }

  return warnings;
}

// Devolve os avisos gerais e o conjunto de chaves do nível acima (ou null, quando não há o que comparar)
function parentLevelCheck(level, diagramsByLevel) {
  const parent = PARENT_LEVEL[level];
  if (!parent) return { warnings: [], parentKeys: null };

  const parentNodes = diagramsByLevel[parent.level]?.nodes ?? [];
  const levelName = LEVEL_NAMES[level];
  const parentName = LEVEL_NAMES[parent.level];

  if (parentNodes.length === 0) {
    const message = `O diagrama de ${parentName} ainda está vazio: o de ${levelName} detalha ${parent.detailedName} dele.`;
    return { warnings: [issue('warning', 'PARENT_LEVEL_EMPTY', message)], parentKeys: null };
  }

  const warnings = [];
  if (!parentNodes.some((node) => node.type === parent.focus)) {
    const message = `O diagrama de ${levelName} detalha ${parent.focusName}, mas o de ${parentName} não tem nenhum.`;
    warnings.push(issue('warning', 'PARENT_LEVEL_WITHOUT_FOCUS', message));
  }

  return { warnings, parentKeys: new Set(parentNodes.map(matchKey)) };
}

function nodeWarnings(level, data, parentKeys) {
  const warnings = [];
  const parent = PARENT_LEVEL[level];
  const connected = new Set(data.edges.flatMap((edge) => [edge.source, edge.target]));

  for (const node of data.nodes) {
    const target = { nodeId: node.id };
    const name = `"${node.data.label}"`;

    if (parentKeys && parent.mirrored.includes(node.type) && !parentKeys.has(matchKey(node))) {
      const message = `${describeNode(node)} não aparece no diagrama de ${LEVEL_NAMES[parent.level]}.`;
      warnings.push(issue('warning', 'MISSING_IN_PARENT_LEVEL', message, target));
    }
    if (data.nodes.length > 1 && !connected.has(node.id)) {
      warnings.push(issue('warning', 'ISOLATED_ELEMENT', `${name} não tem nenhuma relação com os outros elementos.`, target));
    }
    if (TYPES_WITH_TECHNOLOGY.includes(node.type) && !node.data.technology) {
      const message = `${name} não informa a tecnologia (a notação C4 pede a tecnologia de containers e componentes).`;
      warnings.push(issue('warning', 'MISSING_TECHNOLOGY', message, target));
    }
    if (!node.data.description) {
      warnings.push(issue('warning', 'MISSING_DESCRIPTION', `${name} não tem descrição.`, target));
    }
  }

  return warnings;
}

function edgeWarnings(level, data) {
  if (!LEVELS_WITH_TECHNOLOGY_ON_RELATIONSHIPS.has(level)) return [];

  const labels = labelsById(data);
  return data.edges
    .filter((edge) => !edge.technology)
    .map((edge) =>
      issue(
        'warning',
        'RELATIONSHIP_WITHOUT_TECHNOLOGY',
        `A relação "${edge.label}" de "${labels.get(edge.source)}" para "${labels.get(edge.target)}" não informa a tecnologia ou o protocolo.`,
        { edgeId: edge.id }
      )
    );
}

// diagramsByLevel: os diagramas do projeto por nível ({ context, container, component }), já com o estado atual
// do nível validado — os outros níveis servem para os avisos de coerência entre níveis
function validateDiagram(level, diagramsByLevel) {
  const data = diagramsByLevel[level];
  if (!data || data.nodes.length === 0) return [];

  const { warnings: parentWarnings, parentKeys } = parentLevelCheck(level, diagramsByLevel);

  return [
    ...findViolations(level, data),
    ...levelWarnings(level, data),
    ...parentWarnings,
    ...nodeWarnings(level, data, parentKeys),
    ...edgeWarnings(level, data),
  ];
}

module.exports = { findViolations, validateDiagram };
