// Geometria das conexões "flutuantes": no C4 a relação é entre elementos (não entre pontos fixos deles),
// então a linha sai da borda de cada elemento que está virada para o outro.

// Distância entre relações do mesmo par de elementos, para linhas e rótulos não se sobreporem
export const PARALLEL_SPACING = 50;

function center(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// Ponto em que a reta do centro do retângulo até `point` cruza a borda dele
export function borderPointToward(rect, point) {
  const origin = center(rect);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  if (dx === 0 && dy === 0) return origin;

  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  // Escala até a primeira borda atingida (vertical ou horizontal)
  const scale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

// Curva quadrática entre as bordas; `offset` afasta o meio da linha na perpendicular (0 = reta)
export function floatingEdgePath(sourceRect, targetRect, offset) {
  const start = borderPointToward(sourceRect, center(targetRect));
  const end = borderPointToward(targetRect, center(sourceRect));

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  // O ponto de controle fica a 2× o deslocamento: o meio da curva (onde vai o rótulo) fica a 1×
  const control = { x: middle.x + normal.x * offset * 2, y: middle.y + normal.y * offset * 2 };

  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
    labelX: middle.x + normal.x * offset,
    labelY: middle.y + normal.y * offset,
  };
}

// Deslocamento de cada conexão: relações do mesmo par (em qualquer sentido) são distribuídas lado a lado
export function parallelOffsets(edges) {
  const groups = new Map();
  edges.forEach((edge) => {
    const key = [edge.source, edge.target].sort((a, b) => a.localeCompare(b)).join('|');
    groups.set(key, [...(groups.get(key) ?? []), edge]);
  });

  const offsets = new Map();
  groups.forEach((group) => {
    group.forEach((edge, index) => {
      const offset = (index - (group.length - 1) / 2) * PARALLEL_SPACING;
      // A perpendicular inverte com o sentido da linha; o sinal compensa para manter a posição no desenho
      const reversed = edge.source.localeCompare(edge.target) > 0 && offset !== 0;
      offsets.set(edge.id, reversed ? -offset : offset);
    });
  });
  return offsets;
}
