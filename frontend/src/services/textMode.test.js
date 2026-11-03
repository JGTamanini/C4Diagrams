import { describe, it, expect } from 'vitest';
import { diagramToText, parseText, planTextChanges, exampleText } from './textMode';

const node = (id, type, label, data = {}, position = { x: 0, y: 0 }) => ({ id, type, position, data: { label, ...data } });
const edge = (id, source, target, label, technology) => ({ id, source, target, label, data: technology ? { technology } : {} });

const nodes = [
  node('n1', 'c4-person', 'Cliente', { description: 'Compra "livros"' }),
  node('n2', 'c4-system', 'Loja Online', { description: 'Vende livros' }, { x: 300, y: 0 }),
  node('n3', 'c4-system-external', 'Gateway de Pagamento'),
];
const edges = [edge('e1', 'n1', 'n2', 'Compra em'), edge('e2', 'n2', 'n3', 'Cobra via', 'HTTPS')];

function lines(text) {
  return text.split('\n').filter((line) => line && !line.startsWith("'"));
}

describe('modo textual (RF19)', () => {
  describe('diagramToText (o painel abre com o nível atual)', () => {
    it('deve escrever os elementos e as relações, com apelidos legíveis ligados a cada elemento', () => {
      const { text, aliases } = diagramToText('context', nodes, edges);

      expect(lines(text)).toEqual([
        'Pessoa(cliente, "Cliente", "Compra \\"livros\\"")',
        'Sistema(loja_online, "Loja Online", "Vende livros")',
        'SistemaExterno(gateway_de_pagamento, "Gateway de Pagamento")',
        'Rel(cliente, loja_online, "Compra em")',
        'Rel(loja_online, gateway_de_pagamento, "Cobra via", "HTTPS")',
      ]);
      expect(aliases).toEqual({ cliente: 'n1', loja_online: 'n2', gateway_de_pagamento: 'n3' });
    });

    it('deve usar a ordem (apelido, nome, tecnologia, descrição) nos tipos com tecnologia e apelidos únicos', () => {
      const container = [
        node('c1', 'c4-container', 'API', { technology: 'Node.js', description: 'Regras' }),
        node('c2', 'c4-container', 'API', { description: 'Outra' }),
        node('d1', 'c4-container-db', 'Banco', { technology: 'PostgreSQL' }),
        node('c3', 'c4-container', 'Ação & Reação'),
      ];

      expect(lines(diagramToText('container', container, []).text)).toEqual([
        'Container(api, "API", "Node.js", "Regras")',
        'Container(api_2, "API", "", "Outra")',
        'Container(acao_reacao, "Ação & Reação")',
        'BancoDeDados(banco, "Banco", "PostgreSQL")',
      ]);
    });

    it('deve explicar como usar o painel numa linha de comentário', () => {
      expect(diagramToText('context', [], []).text).toMatch(/^' .*Aplicar ao canvas/);
    });
  });

  describe('parseText (ler o texto)', () => {
    it('deve aceitar os nomes em português e os do C4-PlantUML, ignorando comentários e linhas do PlantUML', () => {
      const { elements, relations, errors } = parseText(
        [
          '@startuml',
          "' comentário",
          '// outro comentário',
          'Person(cliente, "Cliente", "Compra")',
          'System_Ext(gateway, "Gateway")',
          'ContainerDb(banco, "Banco", "PostgreSQL", "Dados")',
          'Componente(ctrl, "Controlador", "", "Recebe")',
          'Rel_D(cliente, gateway, "Paga com", "HTTPS")',
          '@enduml',
        ].join('\n')
      );

      expect(errors).toEqual([]);
      expect(elements).toEqual([
        { line: 4, alias: 'cliente', type: 'c4-person', label: 'Cliente', description: 'Compra', technology: null },
        { line: 5, alias: 'gateway', type: 'c4-system-external', label: 'Gateway', description: null, technology: null },
        { line: 6, alias: 'banco', type: 'c4-container-db', label: 'Banco', description: 'Dados', technology: 'PostgreSQL' },
        { line: 7, alias: 'ctrl', type: 'c4-component', label: 'Controlador', description: 'Recebe', technology: null },
      ]);
      expect(relations).toEqual([{ line: 8, from: 'cliente', to: 'gateway', label: 'Paga com', technology: 'HTTPS' }]);
    });

    it('deve aceitar aspas escapadas e vírgulas dentro dos textos', () => {
      const { elements } = parseText('Sistema(loja, "Loja \\"Online\\"", "Livros, revistas e jornais")');

      expect(elements[0]).toEqual(expect.objectContaining({ label: 'Loja "Online"', description: 'Livros, revistas e jornais' }));
    });

    it.each([
      ['Pessoa cliente "Cliente"', 'Linha 1: esperado Tipo(apelido, "Nome", ...).'],
      ['Ator(cliente, "Cliente")', 'Linha 1: "Ator" não é um tipo conhecido. Use Pessoa, Sistema, SistemaExterno, Container, BancoDeDados, Componente ou Rel.'],
      ['Pessoa(1cliente, "Cliente")', 'Linha 1: o apelido "1cliente" é inválido (use letras, números e _, começando por letra).'],
      ['Pessoa(cliente, Cliente)', 'Linha 1: o nome deve estar entre aspas.'],
      ['Pessoa(cliente, "  ")', 'Linha 1: o nome é obrigatório.'],
      ['Pessoa(cliente, "Cliente", "a", "b")', 'Linha 1: argumentos demais para Pessoa.'],
      ['Pessoa(cliente, "Cliente)', 'Linha 1: aspas sem fechar.'],
      ['Rel(cliente, loja)', 'Linha 1: a relação precisa de um rótulo entre aspas.'],
      ['System_Boundary(b, "Loja") {', 'Linha 1: fronteiras não são escritas no texto — o foco do nível é escolhido no editor.'],
      [`Pessoa(cliente, "${'x'.repeat(61)}")`, 'Linha 1: o nome pode ter no máximo 60 caracteres.'],
    ])('deve apontar o erro da linha: %s', (text, message) => {
      expect(parseText(text).errors).toEqual([{ line: 1, message }]);
    });
  });

  describe('planTextChanges (aplicar: adiciona e atualiza, nunca exclui)', () => {
    const { text, aliases } = diagramToText('context', nodes, edges);

    function plan(newText, level = 'context') {
      return planTextChanges({ level, text: newText, aliases, nodes, edges });
    }

    it('não deve mudar nada quando o texto é o gerado', () => {
      expect(plan(text)).toEqual({ errors: [], addNodes: [], addEdges: [], updateNodes: [], updateEdges: [], untouched: 0 });
    });

    it('deve atualizar o elemento e a relação alterados no texto', () => {
      const changed = text
        .replace('"Vende livros"', '"Vende livros e revistas"')
        .replace('Rel(cliente, loja_online, "Compra em")', 'Rel(cliente, loja_online, "Compra livros em", "HTTPS")');

      const result = plan(changed);

      expect(result.updateNodes).toEqual([{ id: 'n2', data: { label: 'Loja Online', description: 'Vende livros e revistas' } }]);
      expect(result.updateEdges).toEqual([{ id: 'e1', label: 'Compra livros em', technology: 'HTTPS' }]);
      expect(result.addNodes).toEqual([]);
    });

    it('deve adicionar elementos e relações novos, posicionados ao lado do que já existe', () => {
      const result = plan(`${text}\nSistemaExterno(email, "Serviço de E-mail", "Envia avisos")\nRel(loja_online, email, "Envia e-mails por")`);

      expect(result.addNodes).toEqual([
        {
          id: expect.any(String),
          type: 'c4-system-external',
          position: { x: 620, y: 480 },
          data: { label: 'Serviço de E-mail', description: 'Envia avisos' },
        },
      ]);
      expect(result.addEdges).toEqual([
        { id: expect.any(String), source: 'n2', target: result.addNodes[0].id, label: 'Envia e-mails por', data: {} },
      ]);
    });

    it('não deve excluir o que foi apagado do texto, só contar o que ficou de fora', () => {
      const result = plan('Pessoa(cliente, "Cliente", "Compra \\"livros\\"")');

      expect(result).toEqual(expect.objectContaining({ errors: [], addNodes: [], updateNodes: [], untouched: 2 }));
    });

    it('deve reaproveitar um elemento com o mesmo tipo e nome em vez de duplicar', () => {
      const result = plan('Pessoa(outro_apelido, "cliente", "Compra")\nRel(outro_apelido, loja_online, "Compra em")');

      expect(result.addNodes).toEqual([]);
      expect(result.updateNodes).toEqual([{ id: 'n1', data: { label: 'cliente', description: 'Compra' } }]);
      expect(result.addEdges).toEqual([]);
    });

    it.each([
      ['Container(api, "API")', 'Linha 1: Container não pertence ao nível Contexto.'],
      [text.replace('Pessoa(cliente,', 'Sistema(cliente,'), 'Linha 3: "Cliente" já é uma Pessoa. Para trocar o tipo, exclua no canvas e crie de novo.'],
      ['Rel(cliente, pagamento, "Paga")', 'Linha 1: "pagamento" não foi definido.'],
      ['Rel(cliente, cliente, "Fala")', 'Linha 1: uma relação liga dois elementos diferentes.'],
      ['Pessoa(a, "A")\nPessoa(a, "B")', 'Linha 2: o apelido "a" já foi usado na linha 1.'],
      [
        'Rel(cliente, loja_online, "Compra")\nRel(loja_online, cliente, "Vende")',
        'Linha 2: já existe uma relação entre "cliente" e "loja_online" no texto (uma por par).',
      ],
    ])('deve recusar, sem aplicar nada: %s', (newText, message) => {
      const result = plan(newText);

      expect(result.errors).toContainEqual({ line: Number(message.match(/Linha (\d+)/)[1]), message });
      expect(result.addNodes).toEqual([]);
      expect(result.updateNodes).toEqual([]);
    });

    it('deve tratar como novo um apelido cujo elemento foi excluído do canvas depois de gerar o texto', () => {
      const result = planTextChanges({ level: 'context', text, aliases, nodes: nodes.slice(0, 2), edges: edges.slice(0, 1) });

      expect(result.addNodes.map((added) => added.data.label)).toEqual(['Gateway de Pagamento']);
      expect(result.addEdges).toHaveLength(1);
    });

    it('deve posicionar num nível vazio a partir do canto, com pessoas em cima', () => {
      const result = planTextChanges({
        level: 'context',
        text: 'Pessoa(p, "Pessoa")\nSistema(s, "Sistema")\nSistemaExterno(x, "Externo")\nSistema(t, "Outro")',
        aliases: {},
        nodes: [],
        edges: [],
      });

      expect(result.addNodes.map((added) => added.position)).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 240 },
        { x: 0, y: 480 },
        { x: 300, y: 240 },
      ]);
    });
  });

  it.each(['context', 'container', 'component'])('deve oferecer um exemplo válido para o nível %s', (level) => {
    const result = planTextChanges({ level, text: exampleText(level), aliases: {}, nodes: [], edges: [] });

    expect(result.errors).toEqual([]);
    expect(result.addNodes.length).toBeGreaterThan(2);
    expect(result.addEdges.length).toBeGreaterThan(1);
  });
});
