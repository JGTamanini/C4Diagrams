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

// Nota: shortName é o rótulo curto da paleta (cabe numa linha sob a miniatura).
// Nota: no c4model.com o sistema externo continua "[Software System]" — o cinza (explicado na legenda) indica que é externo
export const C4_ELEMENTS = {
  'c4-person': { name: 'Pessoa', shortName: 'Pessoa', type: 'Person', background: '#08427B', border: '#073B6F', color: WHITE, shape: 'person' },
  'c4-system': { name: 'Sistema de Software', shortName: 'Sistema', type: 'Software System', background: '#1168BD', border: '#3C7FC0', color: WHITE, shape: 'box' },
  'c4-system-external': { name: 'Sistema Externo', shortName: 'Sistema externo', type: 'Software System', background: '#999999', border: '#8A8A8A', color: WHITE, shape: 'box' },
  'c4-container': { name: 'Container', shortName: 'Container', type: 'Container', background: '#438DD5', border: '#3C7FC0', color: WHITE, shape: 'box', hasTechnology: true },
  'c4-container-db': { name: 'Banco de Dados', shortName: 'Banco de dados', type: 'Container', background: '#438DD5', border: '#3C7FC0', color: WHITE, shape: 'database', hasTechnology: true },
  'c4-component': { name: 'Componente', shortName: 'Componente', type: 'Component', background: '#85BBF0', border: '#78A8D8', color: '#000000', shape: 'box', hasTechnology: true },
};

// Elementos de cada nível (c4model.com): o nível detalha o anterior, então pessoas e sistemas externos
// continuam aparecendo como contexto; no nível de Componente, os containers vizinhos também (RN08)
export const LEVEL_ELEMENTS = {
  context: ['c4-person', 'c4-system', 'c4-system-external'],
  container: ['c4-person', 'c4-system-external', 'c4-container', 'c4-container-db'],
  component: ['c4-person', 'c4-system-external', 'c4-container', 'c4-container-db', 'c4-component'],
};

export function isAllowedInLevel(level, type) {
  return Boolean(LEVEL_ELEMENTS[level]?.includes(type));
}

// Notação oficial: toda conexão tem rótulo; "Usa" é o ponto de partida, editável pelo usuário
export const DEFAULT_RELATIONSHIP_LABEL = 'Usa';

// O C4-PlantUML usa cinza-escuro sobre fundo branco; no canvas escuro, o equivalente legível é um tom quase branco
export const RELATIONSHIP_COLOR = '#E6EDF3';

// Uma conexão não liga um elemento a ele mesmo e só existe uma entre o mesmo par, em qualquer sentido (mesmas
// regras do backend): sem "via dupla" A → B e B → A — se houver mais de um propósito, ele vai no rótulo
export function isValidRelationship({ source, target }, edges = []) {
  if (source === target) return false;
  return !edges.some(
    (edge) => (edge.source === source && edge.target === target) || (edge.source === target && edge.target === source)
  );
}

// O mesmo elemento em níveis diferentes: cada nível guarda cópias próprias (sem id em comum), então a
// correspondência é por tipo e nome, ignorando maiúsculas e espaços extras — a mesma regra do motor de validação
export function elementMatchKey(node) {
  return `${node.type}:${node.data.label.trim().toLowerCase().replaceAll(/\s+/g, ' ')}`;
}

// Limites dos campos do elemento: o título cabe no elemento do canvas e a descrição, nas 4 linhas do campo (sem
// rolagem). São menores que os do backend (100 e 1000) de propósito: o backend continua aceitando textos já
// salvos antes destes limites — o salvamento envia o diagrama inteiro e não pode falhar por um texto antigo
export const TITLE_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 200;
export const TECHNOLOGY_MAX_LENGTH = 100;

// Tamanho máximo de um diagrama: os mesmos limites do backend (diagram.validation.js). Passar deles faria o
// salvamento falhar com 400, então o editor bloqueia antes e avisa o motivo
export const MAX_NODES = 200;
export const MAX_EDGES = 400;

// Notação oficial: todo elemento explicita o tipo; containers e componentes, também a tecnologia
export function typeLabel(type, technology) {
  const elementType = C4_ELEMENTS[type].type;
  return technology ? `[${elementType}: ${technology}]` : `[${elementType}]`;
}

// Notação oficial: a conexão mostra o rótulo e, quando houver, a tecnologia/protocolo
export function withTechnologyLabel(edge) {
  const technology = edge.data?.technology;
  if (!technology) return edge;
  return { ...edge, label: edge.label ? `${edge.label} [${technology}]` : `[${technology}]` };
}
