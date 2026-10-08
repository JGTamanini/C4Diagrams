const { normalizeDiagramData } = require('../../src/services/diagram.validation');
const { InvalidDiagramDataError } = require('../../src/errors/diagram.errors');

function node(overrides = {}) {
  return { id: 'n1', type: 'c4-person', position: { x: 10, y: 20 }, data: { label: 'Cliente' }, ...overrides };
}

function edge(overrides = {}) {
  return { id: 'e1', source: 'n1', target: 'n2', label: 'Usa', ...overrides };
}

function expectInvalid(data, messagePart) {
  expect(() => normalizeDiagramData(data)).toThrow(InvalidDiagramDataError);
  expect(() => normalizeDiagramData(data)).toThrow(messagePart);
}

describe('normalizeDiagramData', () => {
  describe('documento válido', () => {
    it('deve devolver somente os campos conhecidos, descartando o estado interno do React Flow', () => {
      const result = normalizeDiagramData({
        nodes: [
          { ...node(), selected: true, measured: { width: 100 }, dragging: false },
          node({ id: 'n2', type: 'c4-container', data: { label: 'API', technology: 'Node.js', description: 'Regras' } }),
        ],
        edges: [{ ...edge({ technology: 'JSON/HTTPS' }), animated: true, selected: false }],
        viewport: { zoom: 2 },
      });

      expect(result).toEqual({
        nodes: [
          { id: 'n1', type: 'c4-person', position: { x: 10, y: 20 }, data: { label: 'Cliente' } },
          {
            id: 'n2',
            type: 'c4-container',
            position: { x: 10, y: 20 },
            data: { label: 'API', description: 'Regras', technology: 'Node.js' },
          },
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Usa', technology: 'JSON/HTTPS' }],
      });
    });

    it('deve remover espaços das pontas e omitir textos opcionais vazios', () => {
      const result = normalizeDiagramData({
        nodes: [node({ data: { label: '  Cliente  ', description: '   ' } })],
        edges: [],
      });

      expect(result.nodes[0].data).toEqual({ label: 'Cliente' });
    });

    it('deve aceitar o diagrama vazio', () => {
      expect(normalizeDiagramData({ nodes: [], edges: [] })).toEqual({ nodes: [], edges: [] });
    });

    it('deve aceitar até 200 elementos', () => {
      const nodes = Array.from({ length: 200 }, (_, i) => node({ id: `n${i}` }));

      expect(normalizeDiagramData({ nodes, edges: [] }).nodes).toHaveLength(200);
    });
  });

  describe('estrutura do documento', () => {
    it.each([
      ['não for um objeto', null],
      ['não tiver a lista de elementos', { edges: [] }],
      ['não tiver a lista de conexões', { nodes: [] }],
    ])('deve recusar quando o documento %s', (_, data) => {
      expectInvalid(data, 'O diagrama deve conter as listas "nodes" e "edges".');
    });

    it('deve recusar mais de 200 elementos', () => {
      const nodes = Array.from({ length: 201 }, (_, i) => node({ id: `n${i}` }));

      expectInvalid({ nodes, edges: [] }, 'O diagrama pode ter no máximo 200 elementos.');
    });
  });

  describe('elementos', () => {
    it.each([
      ['sem id', node({ id: '' }), 'Todo elemento deve ter um id.'],
      ['com tipo desconhecido', node({ type: 'c4-banana' }), 'Elemento "n1": tipo "c4-banana" não é um tipo C4 suportado.'],
      ['com posição inválida', node({ position: { x: 'a', y: 0 } }), 'Elemento "n1": posição inválida.'],
      ['com posição infinita', node({ position: { x: Infinity, y: 0 } }), 'Elemento "n1": posição inválida.'],
      ['sem título', node({ data: { label: '  ' } }), 'Elemento "n1": o título é obrigatório.'],
      ['com título longo demais', node({ data: { label: 'a'.repeat(101) } }), 'Elemento "n1": o título deve ter no máximo 100 caracteres.'],
      [
        'com descrição longa demais',
        node({ data: { label: 'Cliente', description: 'a'.repeat(1001) } }),
        'Elemento "n1": a descrição deve ter no máximo 1000 caracteres.',
      ],
      [
        'com tecnologia em tipo que não a aceita',
        node({ data: { label: 'Cliente', technology: 'React' } }),
        'Elemento "n1": o tipo "c4-person" não possui tecnologia.',
      ],
    ])('deve recusar elemento %s', (_, invalidNode, message) => {
      expectInvalid({ nodes: [invalidNode], edges: [] }, message);
    });

    it('deve recusar ids de elemento repetidos', () => {
      expectInvalid({ nodes: [node(), node()], edges: [] }, 'Elemento "n1": id repetido no diagrama.');
    });
  });

  describe('conexões', () => {
    const twoNodes = [node(), node({ id: 'n2', type: 'c4-system' })];

    it.each([
      ['sem id', edge({ id: '' }), 'Toda conexão deve ter um id.'],
      ['para elemento inexistente', edge({ target: 'n9' }), 'Conexão "e1": deve ligar dois elementos existentes no diagrama.'],
      ['de um elemento para ele mesmo', edge({ target: 'n1' }), 'Conexão "e1": não pode ligar um elemento a ele mesmo.'],
      ['sem rótulo', edge({ label: '' }), 'Conexão "e1": o rótulo é obrigatório.'],
      ['com tecnologia longa demais', edge({ technology: 'a'.repeat(101) }), 'Conexão "e1": a tecnologia deve ter no máximo 100 caracteres.'],
    ])('deve recusar conexão %s', (_, invalidEdge, message) => {
      expectInvalid({ nodes: twoNodes, edges: [invalidEdge] }, message);
    });

    it('deve recusar ids de conexão repetidos', () => {
      expectInvalid({ nodes: twoNodes, edges: [edge(), edge()] }, 'Conexão "e1": id repetido no diagrama.');
    });

    it('deve recusar mais de 400 conexões', () => {
      const edges = Array.from({ length: 401 }, (_, i) => edge({ id: `e${i}` }));

      expectInvalid({ nodes: twoNodes, edges }, 'O diagrama pode ter no máximo 400 conexões.');
    });
  });
});
