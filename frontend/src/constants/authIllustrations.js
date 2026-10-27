import { NODE_TYPES } from './diagramNodeTypes';

// Nota: ilustração da direita em cada tela de entrada (escolhida pela tela via useAuthIllustration)
export const AUTH_ILLUSTRATIONS = {
  login: {
    nodes: [
      { x: 70, y: 0, label: 'API', sublabel: '[Container]', ...NODE_TYPES.container },
      { x: 0, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
      { x: 140, y: 75, label: 'Serviço IA', sublabel: '[Externo]', ...NODE_TYPES.external },
    ],
    connections: [
      { x1: 95, y1: 45, x2: 60, y2: 80, color: 'var(--color-line)' },
      { x1: 145, y1: 45, x2: 190, y2: 80, color: 'var(--color-line)' },
    ],
  },
  register: {
    nodes: [
      { x: 75, y: 0, label: 'Person', sublabel: 'Novo usuário', ...NODE_TYPES.person },
      { x: 10, y: 75, label: 'Web App', sublabel: '[Container]', ...NODE_TYPES.container },
      { x: 140, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
    ],
    connections: [
      { x1: 100, y1: 45, x2: 65, y2: 80, color: 'var(--color-line)' },
      { x1: 150, y1: 45, x2: 195, y2: 80, color: 'var(--color-line)' },
    ],
  },
  emailSent: {
    nodes: [
      { x: 75, y: 0, label: 'Person', sublabel: 'Novo usuário', ...NODE_TYPES.person },
      { x: 75, y: 75, label: 'Serviço e-mail', sublabel: '[Externo]', ...NODE_TYPES.emailService },
    ],
    connections: [{ x1: 128, y1: 45, x2: 128, y2: 80, color: 'var(--color-success)' }],
  },
  recovery: {
    nodes: [
      { x: 75, y: 0, label: 'Person', sublabel: 'Usuário', ...NODE_TYPES.person },
      { x: 75, y: 75, label: 'Serviço e-mail', sublabel: '[Externo]', ...NODE_TYPES.emailService },
    ],
    connections: [{ x1: 128, y1: 45, x2: 128, y2: 80, color: 'var(--color-success)' }],
  },
  reset: {
    nodes: [
      { x: 75, y: 0, label: 'Person', sublabel: 'Usuário', ...NODE_TYPES.person },
      { x: 75, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
    ],
    connections: [{ x1: 128, y1: 45, x2: 128, y2: 80, color: 'var(--color-line)' }],
  },
};
