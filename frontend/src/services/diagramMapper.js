// Conversão entre o documento da API de diagramas (#38) e o estado do React Flow.
// Funções puras: o contrato da API fica isolado da lógica do editor.

// API → React Flow: a tecnologia da conexão vai para edge.data
export function fromApi(data) {
  return {
    ...(data.scope ? { scope: data.scope } : {}),
    nodes: data.nodes,
    edges: data.edges.map(({ technology, ...edge }) => ({ ...edge, data: technology ? { technology } : {} })),
  };
}

// Nota: campos vazios são omitidos — o PUT substitui o documento inteiro do nível, então omitir já apaga o valor salvo
export function pickNodeData({ label, description, technology }) {
  return {
    label,
    ...(description ? { description } : {}),
    ...(technology ? { technology } : {}),
  };
}

// React Flow → API: só os campos do documento (o estado interno do React Flow fica de fora).
// Conexões cujo elemento foi removido são descartadas para não enviar um documento inválido.
// scope (RF22): o elemento do nível de cima que este nível detalha, quando escolhido
export function toApi({ nodes, edges, scope }) {
  const nodeIds = new Set(nodes.map((node) => node.id));

  return {
    nodes: nodes.map(({ id, type, position, data }) => ({
      id,
      type,
      position: { x: position.x, y: position.y },
      data: pickNodeData(data),
    })),
    edges: edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map(({ id, source, target, label, data }) => ({
        id,
        source,
        target,
        label,
        ...(data?.technology ? { technology: data.technology } : {}),
      })),
    ...(scope ? { scope } : {}),
  };
}
