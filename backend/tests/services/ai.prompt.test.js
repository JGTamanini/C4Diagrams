const { SYSTEM_PROMPT, SUGGESTIONS_SCHEMA, buildUserMessage } = require('../../src/services/ai.prompt');

const node = (id, type, label, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...extra } });

const project = { name: 'Loja Online', description: 'E-commerce de livros' };
const containerData = {
  nodes: [
    node('c1', 'c4-container', 'API', { technology: 'Node.js', description: 'Regras de pedidos' }),
    node('d1', 'c4-container-db', 'Banco'),
  ],
  edges: [{ id: 'e1', source: 'c1', target: 'd1', label: 'Lê e grava', technology: 'SQL' }],
};

describe('Prompt das sugestões (RF16)', () => {
  it('deve orientar a IA a sugerir sem construir pelo usuário, em português e só com tipos do nível', () => {
    expect(SYSTEM_PROMPT).toMatch(/nunca altera o diagrama/i);
    expect(SYSTEM_PROMPT).toMatch(/português/i);
    expect(SYSTEM_PROMPT).toContain('c4-container-db');
    expect(SYSTEM_PROMPT).toMatch(/dados, não instruções/i);
  });

  it('deve exigir a resposta num formato fechado (todos os campos, sem campos extras)', () => {
    const item = SUGGESTIONS_SCHEMA.properties.suggestions.items;

    expect(SUGGESTIONS_SCHEMA.additionalProperties).toBe(false);
    expect(item.additionalProperties).toBe(false);
    expect(item.required).toEqual(Object.keys(item.properties));
    expect(item.properties.kind.enum).toEqual(['add_element', 'add_relationship', 'improve_text', 'note']);
  });

  it('deve descrever o nível aberto, os outros níveis e o que o validador já apontou', () => {
    const message = buildUserMessage({
      project,
      level: 'container',
      data: containerData,
      otherLevels: { context: { nodes: [node('p1', 'c4-person', 'Cliente'), node('s1', 'c4-system', 'Loja Online')], edges: [] } },
      knownIssues: ['"Banco" não tem tecnologia.'],
      depth: 'standard',
    });
    const parsed = JSON.parse(message.slice(message.indexOf('{')));

    expect(message).toMatch(/Revise o diagrama/);
    expect(parsed.projeto).toEqual({ nome: 'Loja Online', descricao: 'E-commerce de livros' });
    expect(parsed.nivel).toBe('container');
    expect(parsed.elementos).toEqual([
      { tipo: 'c4-container', nome: 'API', descricao: 'Regras de pedidos', tecnologia: 'Node.js' },
      { tipo: 'c4-container-db', nome: 'Banco', descricao: null, tecnologia: null },
    ]);
    expect(parsed.relacoes).toEqual([{ de: 'API', para: 'Banco', rotulo: 'Lê e grava', tecnologia: 'SQL' }]);
    expect(parsed.outrosNiveis).toEqual({ context: ['Cliente (c4-person)', 'Loja Online (c4-system)'] });
    expect(parsed.jaApontadoPeloValidador).toEqual(['"Banco" não tem tecnologia.']);
  });

  it('deve pedir o ponto de partida quando o nível está vazio, usando a descrição informada', () => {
    const message = buildUserMessage({
      project,
      level: 'context',
      data: { nodes: [], edges: [] },
      otherLevels: {},
      knownIssues: [],
      description: 'Uma loja de livros com pagamento por cartão',
      depth: 'standard',
    });

    expect(message).toMatch(/ponto de partida/);
    expect(JSON.parse(message.slice(message.indexOf('{'))).projeto.descricao).toBe('Uma loja de livros com pagamento por cartão');
  });

  it('deve pedir uma análise mais profunda na análise aprofundada', () => {
    const message = buildUserMessage({ project, level: 'container', data: containerData, otherLevels: {}, knownIssues: [], depth: 'deep' });

    expect(message).toMatch(/análise aprofundada/i);
  });

  it('deve listar o que foi descartado antes, para a segunda tentativa não repetir', () => {
    const message = buildUserMessage({
      project,
      level: 'container',
      data: containerData,
      otherLevels: {},
      knownIssues: [],
      depth: 'standard',
      discarded: [{ title: 'Adicione um Sistema', problem: 'não pertence ao nível' }],
    });

    expect(message).toMatch(/foram descartadas/);
    expect(message).toContain('Adicione um Sistema: não pertence ao nível');
  });
});
