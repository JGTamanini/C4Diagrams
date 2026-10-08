// Nota: vocabulário do modelo C4 usado pelo sistema (c4model.com). O nível "code" está fora do MVP (RFC 2.6).
// Centralizado aqui para ser reaproveitado pelo motor de validação C4 (Fase 5).
const LEVELS = ['context', 'container', 'component'];

const NODE_TYPES = [
  'c4-person',
  'c4-system',
  'c4-system-external',
  'c4-container',
  'c4-container-db',
  'c4-component',
];

// Notação oficial: todo container e componente deve ter a tecnologia explicitada
const TYPES_WITH_TECHNOLOGY = ['c4-container', 'c4-container-db', 'c4-component'];

module.exports = { LEVELS, NODE_TYPES, TYPES_WITH_TECHNOLOGY };
