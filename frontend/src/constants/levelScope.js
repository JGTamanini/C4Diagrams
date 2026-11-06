// Nota: RF22 — ligação entre níveis. No C4, cada nível dá zoom num elemento do nível de cima: o de Containers mostra
// o que existe dentro de um Sistema de Software do Contexto; o de Componentes, o que existe dentro de um Container.
// Esse elemento é o "foco" do nível (um por nível, como o C4 e a RN06). A mesma regra do motor de validação
// (backend/src/services/c4.validation.js): sem foco escolhido, vale o único candidato do nível de cima.

const SCOPE_PARENT = {
  container: { level: 'context', focus: 'c4-system' },
  component: { level: 'container', focus: 'c4-container' },
};

// Quem fica dentro da fronteira do elemento detalhado (pessoas, sistemas externos e vizinhos ficam fora)
export const INNER_TYPES = {
  container: ['c4-container', 'c4-container-db'],
  component: ['c4-component'],
};

// Nome do tipo do elemento detalhado, como a notação C4 escreve no rótulo da fronteira
export const SCOPE_TYPE_LABEL = { container: 'Software System', component: 'Container' };

// status: chosen (escolhido), implicit (único candidato), ambiguous (vários, nenhum escolhido), missing (o escolhido
// não existe mais), none (nenhum candidato no nível de cima)
export function resolveScope(level, nodesByLevel, scopeByLevel) {
  const parent = SCOPE_PARENT[level];
  if (!parent) return null;

  const candidates = nodesByLevel[parent.level].filter((node) => node.type === parent.focus);
  const scope = scopeByLevel[level];
  const base = { parentLevel: parent.level, candidates };

  if (scope) {
    const focus = candidates.find((node) => node.id === scope.nodeId) ?? null;
    return { ...base, focus, status: focus ? 'chosen' : 'missing' };
  }
  if (candidates.length === 1) return { ...base, focus: candidates[0], status: 'implicit' };
  return { ...base, focus: null, status: candidates.length > 1 ? 'ambiguous' : 'none' };
}

export function isInnerType(level, type) {
  return Boolean(INNER_TYPES[level]?.includes(type));
}

// Em qual nível o elemento é detalhado (o Sistema, no de Containers; o Container, no de Componentes), ou null
export function detailLevelOf(level, type) {
  const entry = Object.entries(SCOPE_PARENT).find(([, parent]) => parent.level === level && parent.focus === type);
  return entry ? entry[0] : null;
}
