import { describe, it, expect } from 'vitest';
import { fromApi, pickNodeData, toApi } from './diagramMapper';

describe('diagramMapper', () => {
  describe('fromApi', () => {
    it('deve levar a tecnologia da conexão para edge.data, onde o React Flow guarda dados extras', () => {
      const diagram = fromApi({
        nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }],
        edges: [
          { id: 'e1', source: 'n1', target: 'n2', label: 'Usa', technology: 'HTTPS' },
          { id: 'e2', source: 'n2', target: 'n1', label: 'Notifica' },
        ],
      });

      expect(diagram.nodes).toHaveLength(1);
      expect(diagram.edges).toEqual([
        { id: 'e1', source: 'n1', target: 'n2', label: 'Usa', data: { technology: 'HTTPS' } },
        { id: 'e2', source: 'n2', target: 'n1', label: 'Notifica', data: {} },
      ]);
    });
  });

  describe('pickNodeData', () => {
    it('deve omitir descrição e tecnologia vazias — o PUT substitui o documento inteiro, então omitir é apagar', () => {
      expect(pickNodeData({ label: 'API', description: '', technology: 'Node.js', selected: true })).toEqual({
        label: 'API',
        technology: 'Node.js',
      });
    });
  });

  describe('toApi', () => {
    it('deve enviar só os campos do documento, sem o estado interno do React Flow', () => {
      const document = toApi({
        nodes: [
          {
            id: 'n1',
            type: 'c4-container',
            position: { x: 10, y: 20 },
            data: { label: 'API', description: 'Regras', technology: '' },
            selected: true,
            measured: { width: 200, height: 90 },
          },
          { id: 'n2', type: 'c4-container-db', position: { x: 0, y: 200 }, data: { label: 'Banco' } },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Lê', data: { technology: 'SQL' }, selected: true }],
      });

      expect(document).toEqual({
        nodes: [
          { id: 'n1', type: 'c4-container', position: { x: 10, y: 20 }, data: { label: 'API', description: 'Regras' } },
          { id: 'n2', type: 'c4-container-db', position: { x: 0, y: 200 }, data: { label: 'Banco' } },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Lê', technology: 'SQL' }],
      });
    });

    it('deve descartar conexões cujo elemento não existe mais', () => {
      const document = toApi({
        nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }],
        edges: [{ id: 'e1', source: 'n1', target: 'removido', label: 'Usa', data: {} }],
      });

      expect(document.edges).toEqual([]);
    });
  });
});
