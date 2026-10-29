// Nota: vocabulário do modelo C4 usado pelo sistema (c4model.com). O nível "code" está fora do MVP (RFC 2.6).
// Centralizado aqui para ser reaproveitado pelo motor de validação C4 (services/c4.validation.js).
const LEVELS = ['context', 'container', 'component'];

const NODE_TYPES = [
  'c4-person',
  'c4-system',
  'c4-system-external',
  'c4-container',
  'c4-container-db',
  'c4-component',
];

// Tipos que aceitam tecnologia. A notação oficial pede tecnologia em todo container e componente, mas ela é
// OPCIONAL ao salvar: o diagrama pode estar em construção (o autosave não pode falhar). A falta dela é uma
// inconsistência a sinalizar sem bloquear (RN11), papel do motor de validação C4.
const TYPES_WITH_TECHNOLOGY = ['c4-container', 'c4-container-db', 'c4-component'];

// RN08 — elementos válidos em cada nível (mesma tabela do frontend, constants/c4Notation.js). O nível detalha o
// anterior, então pessoas e sistemas externos continuam aparecendo como contexto; no de Componente, os
// containers vizinhos também.
const LEVEL_ELEMENTS = {
  context: ['c4-person', 'c4-system', 'c4-system-external'],
  container: ['c4-person', 'c4-system-external', 'c4-container', 'c4-container-db'],
  component: ['c4-person', 'c4-system-external', 'c4-container', 'c4-container-db', 'c4-component'],
};

// Nomes exibidos nas mensagens do motor de validação
const LEVEL_NAMES = { context: 'Contexto', container: 'Containers', component: 'Componentes' };

const NODE_TYPE_NAMES = {
  'c4-person': 'Pessoa',
  'c4-system': 'Sistema de Software',
  'c4-system-external': 'Sistema Externo',
  'c4-container': 'Container',
  'c4-container-db': 'Banco de Dados',
  'c4-component': 'Componente',
};

module.exports = { LEVELS, NODE_TYPES, TYPES_WITH_TECHNOLOGY, LEVEL_ELEMENTS, LEVEL_NAMES, NODE_TYPE_NAMES };
