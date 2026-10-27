// Composições abstratas (sem texto) no espírito de cada nível C4, em um viewBox de 320x140.
// Cada forma: tipo C4 (cor oficial), formato e caixa; cada ligação: [x1, y1, x2, y2].
export const COVERS = [
  // Contexto: pessoa → sistema → sistema externo
  {
    shapes: [
      { type: 'c4-person', kind: 'person', x: 40, y: 38, w: 40, h: 52 },
      { type: 'c4-system', kind: 'box', x: 128, y: 50, w: 76, h: 40 },
      { type: 'c4-system-external', kind: 'box', x: 244, y: 50, w: 56, h: 40 },
    ],
    links: [
      [84, 70, 124, 70],
      [204, 70, 240, 70],
    ],
  },
  // Container: web → api → externo, api → banco de dados
  {
    shapes: [
      { type: 'c4-container', kind: 'box', x: 24, y: 26, w: 72, h: 36 },
      { type: 'c4-container', kind: 'box', x: 136, y: 26, w: 72, h: 36 },
      { type: 'c4-container-db', kind: 'database', x: 136, y: 84, w: 72, h: 40 },
      { type: 'c4-system-external', kind: 'box', x: 248, y: 26, w: 52, h: 36 },
    ],
    links: [
      [96, 44, 132, 44],
      [208, 44, 244, 44],
      [172, 62, 172, 80],
    ],
  },
  // Componente: dois componentes → componente central → banco de dados
  {
    shapes: [
      { type: 'c4-component', kind: 'box', x: 26, y: 24, w: 72, h: 34 },
      { type: 'c4-component', kind: 'box', x: 26, y: 84, w: 72, h: 34 },
      { type: 'c4-component', kind: 'box', x: 138, y: 54, w: 72, h: 34 },
      { type: 'c4-container-db', kind: 'database', x: 248, y: 50, w: 52, h: 42 },
    ],
    links: [
      [98, 44, 134, 64],
      [98, 98, 134, 78],
      [210, 71, 244, 71],
    ],
  },
];

export const COVER_VARIANTS = COVERS.length;

// Mesmo projeto, mesma capa: a composição vem de um hash simples do identificador
export function coverVariant(seed) {
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash % COVER_VARIANTS;
}
