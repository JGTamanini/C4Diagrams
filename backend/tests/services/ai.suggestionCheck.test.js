const { checkSuggestions, MAX_SUGGESTIONS } = require('../../src/services/ai.suggestionCheck');

const node = (id, type, label, extra = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { label, ...extra } });

const contextData = {
  nodes: [node('n1', 'c4-person', 'Cliente'), node('n2', 'c4-system', 'Loja Online')],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' }],
};

// Sugestão no formato da resposta da IA: todos os campos presentes, null quando não se aplicam
function suggestion(fields) {
  return {
    kind: 'note',
    title: 'Título',
    reason: 'Porque sim.',
    elementType: null,
    name: null,
    description: null,
    technology: null,
    source: null,
    target: null,
    targetName: null,
    ...fields,
  };
}

describe('checkSuggestions (motor do RF17 conferindo as sugestões da IA)', () => {
  it('deve manter um elemento novo permitido no nível', () => {
    const { kept, discarded } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_element', title: 'Adicione o Gateway', elementType: 'c4-system-external', name: 'Gateway de Pagamento' }),
    ]);

    expect(discarded).toEqual([]);
    expect(kept).toEqual([
      expect.objectContaining({ id: 's1', kind: 'add_element', elementType: 'c4-system-external', name: 'Gateway de Pagamento' }),
    ]);
  });

  it('deve descartar elemento que não pertence ao nível (RN08)', () => {
    const { kept, discarded } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_element', elementType: 'c4-container', name: 'API' }),
    ]);

    expect(kept).toEqual([]);
    expect(discarded).toEqual([expect.objectContaining({ name: 'API', problem: expect.stringContaining('não pertence') })]);
  });

  it('deve descartar elemento que já existe (mesmo tipo e nome, sem diferenciar maiúsculas e espaços)', () => {
    const { kept, discarded } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_element', elementType: 'c4-person', name: '  cliente ' }),
    ]);

    expect(kept).toEqual([]);
    expect(discarded[0].problem).toMatch(/já existe/);
  });

  it('deve manter relação entre elementos existentes ou sugeridos no mesmo pedido', () => {
    const { kept } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_element', elementType: 'c4-system-external', name: 'Gateway' }),
      suggestion({ kind: 'add_relationship', source: 'Loja Online', target: 'Gateway', description: 'Cobra via' }),
    ]);

    expect(kept.map((item) => item.kind)).toEqual(['add_element', 'add_relationship']);
  });

  it('deve descartar relação que cita elemento inexistente', () => {
    const { kept, discarded } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_relationship', source: 'Cliente', target: 'Banco Central' }),
    ]);

    expect(kept).toEqual([]);
    expect(discarded[0].problem).toMatch(/não existe/);
  });

  it('deve descartar relação repetida entre o mesmo par, em qualquer sentido (erro do motor)', () => {
    const { kept, discarded } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_relationship', source: 'Loja Online', target: 'Cliente' }),
    ]);

    expect(kept).toEqual([]);
    expect(discarded[0].problem).toMatch(/Já existe uma relação/);
  });

  it('deve descartar relação de um elemento com ele mesmo', () => {
    const { kept } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_relationship', source: 'Cliente', target: 'cliente' }),
    ]);

    expect(kept).toEqual([]);
  });

  it('deve ligar a melhoria de texto ao elemento citado (para o editor centralizar nele)', () => {
    const { kept } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'improve_text', title: 'Descreva a loja', targetName: 'loja online' }),
    ]);

    expect(kept).toEqual([expect.objectContaining({ kind: 'improve_text', nodeId: 'n2', targetName: 'Loja Online' })]);
  });

  it('deve descartar melhoria de texto de elemento inexistente', () => {
    const { kept } = checkSuggestions('context', contextData, [suggestion({ kind: 'improve_text', targetName: 'Fantasma' })]);

    expect(kept).toEqual([]);
  });

  it('deve manter observações, ligando ao elemento só quando ele existir', () => {
    const { kept } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'note', title: 'Sobre o cliente', targetName: 'Cliente' }),
      suggestion({ kind: 'note', title: 'Geral', targetName: 'Inexistente' }),
    ]);

    expect(kept).toEqual([
      expect.objectContaining({ title: 'Sobre o cliente', nodeId: 'n1' }),
      expect.objectContaining({ title: 'Geral', nodeId: null, targetName: null }),
    ]);
  });

  it('deve descartar sugestão sem título e limpar textos (espaços e tamanho)', () => {
    const { kept, discarded } = checkSuggestions('context', contextData, [
      suggestion({ title: '   ' }),
      suggestion({ title: `  ${'a'.repeat(500)}  `, reason: '  motivo  ' }),
    ]);

    expect(discarded).toHaveLength(1);
    expect(kept[0].title).toHaveLength(160);
    expect(kept[0].reason).toBe('motivo');
  });

  it('deve ignorar tecnologia em tipos que não a têm', () => {
    const { kept } = checkSuggestions('context', contextData, [
      suggestion({ kind: 'add_element', elementType: 'c4-person', name: 'Admin', technology: 'React' }),
    ]);

    expect(kept[0].technology).toBeNull();
  });

  it(`deve devolver no máximo ${MAX_SUGGESTIONS} sugestões`, () => {
    const many = Array.from({ length: 12 }, (_, index) => suggestion({ title: `Nota ${index}` }));

    expect(checkSuggestions('context', contextData, many).kept).toHaveLength(MAX_SUGGESTIONS);
  });

  it('deve tratar resposta sem lista como nenhuma sugestão', () => {
    expect(checkSuggestions('context', contextData, undefined)).toEqual({ kept: [], discarded: [] });
  });
});
