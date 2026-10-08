// Notação C4 oficial (c4model.com) — independente das cores decorativas da interface (diagramNodeTypes.js).
// Cores conforme a convenção de fato do C4-PlantUML / Structurizr.

// Nível "code" fora do MVP (RFC 2.6)
export const LEVELS = [
  { id: 'context', label: 'Contexto', title: 'Diagrama de Contexto' },
  { id: 'container', label: 'Container', title: 'Diagrama de Containers' },
  { id: 'component', label: 'Componente', title: 'Diagrama de Componentes' },
];

export const LEVEL_IDS = LEVELS.map((level) => level.id);

const WHITE = '#FFFFFF';

// Nota: no c4model.com o sistema externo continua "[Software System]" — o cinza (explicado na legenda) indica que é externo
export const C4_ELEMENTS = {
  'c4-person': { name: 'Pessoa', type: 'Person', background: '#08427B', border: '#073B6F', color: WHITE, shape: 'person' },
  'c4-system': { name: 'Sistema de Software', type: 'Software System', background: '#1168BD', border: '#3C7FC0', color: WHITE, shape: 'box' },
  'c4-system-external': { name: 'Sistema Externo', type: 'Software System', background: '#999999', border: '#8A8A8A', color: WHITE, shape: 'box' },
  'c4-container': { name: 'Container', type: 'Container', background: '#438DD5', border: '#3C7FC0', color: WHITE, shape: 'box', hasTechnology: true },
  'c4-container-db': { name: 'Banco de Dados', type: 'Container', background: '#438DD5', border: '#3C7FC0', color: WHITE, shape: 'database', hasTechnology: true },
  'c4-component': { name: 'Componente', type: 'Component', background: '#85BBF0', border: '#78A8D8', color: '#000000', shape: 'box', hasTechnology: true },
};

// Notação oficial: todo elemento explicita o tipo; containers e componentes, também a tecnologia
export function typeLabel(type, technology) {
  const elementType = C4_ELEMENTS[type].type;
  return technology ? `[${elementType}: ${technology}]` : `[${elementType}]`;
}

// Notação oficial: a conexão mostra o rótulo e, quando houver, a tecnologia/protocolo
export function withTechnologyLabel(edge) {
  const technology = edge.data?.technology;
  return technology ? { ...edge, label: `${edge.label} [${technology}]` } : edge;
}
