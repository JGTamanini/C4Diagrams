const { findViolations, validateDiagram } = require('../../src/services/c4.validation');

function node(id, type, label, data = {}) {
  return { id, type, position: { x: 0, y: 0 }, data: { label, ...data } };
}

function edge(id, source, target, extra = {}) {
  return { id, source, target, label: 'Usa', ...extra };
}

function codes(issues) {
  return issues.map((issue) => issue.code);
}

// Diagrama de Contexto "completo": sem nenhum aviso
const completeContext = {
  nodes: [
    node('p1', 'c4-person', 'Cliente', { description: 'Compra produtos' }),
    node('s1', 'c4-system', 'Loja Online', { description: 'Vende produtos' }),
    node('x1', 'c4-system-external', 'Gateway de Pagamento', { description: 'Processa pagamentos' }),
  ],
  edges: [edge('e1', 'p1', 's1'), edge('e2', 's1', 'x1')],
};

const completeContainer = {
  nodes: [
    node('p1', 'c4-person', 'Cliente', { description: 'Compra produtos' }),
    node('c1', 'c4-container', 'API', { description: 'Regras de negócio', technology: 'Node.js' }),
    node('d1', 'c4-container-db', 'Banco de Dados', { description: 'Pedidos', technology: 'PostgreSQL' }),
    node('x1', 'c4-system-external', 'Gateway de Pagamento', { description: 'Processa pagamentos' }),
  ],
  edges: [
    edge('e1', 'p1', 'c1', { technology: 'HTTPS' }),
    edge('e2', 'c1', 'd1', { technology: 'SQL' }),
    edge('e3', 'c1', 'x1', { technology: 'HTTPS' }),
  ],
};

describe('Motor de validação C4', () => {
  describe('findViolations (erros que impedem salvar)', () => {
    it('não deve apontar nada num diagrama válido', () => {
      expect(findViolations('context', completeContext)).toEqual([]);
    });

    it('deve apontar elemento incompatível com o nível (RN08)', () => {
      const data = { nodes: [node('c1', 'c4-component', 'Controlador de Pedidos')], edges: [] };

      expect(findViolations('context', data)).toEqual([
        {
          code: 'ELEMENT_NOT_ALLOWED_IN_LEVEL',
          severity: 'error',
          nodeId: 'c1',
          message: '"Controlador de Pedidos" (Componente) não pertence ao diagrama de Contexto.',
        },
      ]);
    });

    it('deve aceitar pessoas e sistemas externos também nos níveis de detalhe (RN08)', () => {
      const data = {
        nodes: [node('p1', 'c4-person', 'Cliente'), node('x1', 'c4-system-external', 'Gateway')],
        edges: [],
      };

      expect(findViolations('component', data)).toEqual([]);
    });

    it('deve apontar uma segunda relação entre o mesmo par, no mesmo sentido ou no oposto (sem "via dupla")', () => {
      const data = {
        nodes: [node('p1', 'c4-person', 'Cliente'), node('s1', 'c4-system', 'Loja Online')],
        edges: [edge('e1', 'p1', 's1'), edge('e2', 's1', 'p1'), edge('e3', 'p1', 's1', { label: 'Paga em' })],
      };

      // A mensagem cita os elementos no sentido da relação apontada
      const message = (from, to) => `Já existe uma relação entre "${from}" e "${to}". Use uma só relação entre o mesmo par.`;
      expect(findViolations('context', data)).toEqual([
        { code: 'DUPLICATE_RELATIONSHIP', severity: 'error', edgeId: 'e2', message: message('Loja Online', 'Cliente') },
        { code: 'DUPLICATE_RELATIONSHIP', severity: 'error', edgeId: 'e3', message: message('Cliente', 'Loja Online') },
      ]);
    });
  });

  describe('validateDiagram (erros e avisos, sem bloquear a edição — RN11)', () => {
    it('não deve apontar nada num diagrama vazio', () => {
      expect(validateDiagram('context', { context: { nodes: [], edges: [] } })).toEqual([]);
    });

    it('não deve apontar nada num diagrama de Contexto completo', () => {
      expect(validateDiagram('context', { context: completeContext })).toEqual([]);
    });

    it('deve ordenar por importância: erros, depois avisos do modelo, depois sugestões', () => {
      const data = { nodes: [node('c1', 'c4-component', 'Controlador')], edges: [] };

      const issues = validateDiagram('context', { context: data });

      expect(issues.map((issue) => issue.severity)).toEqual(['error', 'warning', 'warning', 'info', 'info']);
      expect(issues.map((issue) => issue.code)).toEqual([
        'ELEMENT_NOT_ALLOWED_IN_LEVEL',
        'CONTEXT_WITHOUT_SYSTEM',
        'CONTEXT_WITHOUT_PERSON',
        'MISSING_TECHNOLOGY',
        'MISSING_DESCRIPTION',
      ]);
    });

    describe('avisos do nível', () => {
      it('deve avisar quando o Contexto não tem Sistema de Software nem Pessoa', () => {
        const data = { nodes: [node('x1', 'c4-system-external', 'Gateway', { description: 'Pagamentos' })], edges: [] };

        expect(codes(validateDiagram('context', { context: data }))).toEqual([
          'CONTEXT_WITHOUT_SYSTEM',
          'CONTEXT_WITHOUT_PERSON',
        ]);
      });

      it.each([
        ['container', 'CONTAINER_LEVEL_WITHOUT_CONTAINER'],
        ['component', 'COMPONENT_LEVEL_WITHOUT_COMPONENT'],
      ])('deve avisar quando o nível %s não tem o elemento que ele detalha', (level, code) => {
        const data = { nodes: [node('p1', 'c4-person', 'Cliente', { description: 'Compra' })], edges: [] };

        expect(codes(validateDiagram(level, { [level]: data }))).toContain(code);
      });

      it('deve avisar elemento isolado só quando houver mais de um elemento', () => {
        const single = { nodes: [node('s1', 'c4-system', 'Loja', { description: 'Vende' })], edges: [] };
        const withIsolated = {
          ...completeContext,
          nodes: [...completeContext.nodes, node('x2', 'c4-system-external', 'E-mail', { description: 'Envia' })],
        };

        expect(codes(validateDiagram('context', { context: single }))).not.toContain('ISOLATED_ELEMENT');
        expect(validateDiagram('context', { context: withIsolated })).toEqual([
          {
            code: 'ISOLATED_ELEMENT',
            severity: 'warning',
            nodeId: 'x2',
            message: '"E-mail" não tem nenhuma relação com os outros elementos.',
          },
        ]);
      });

      it('deve sugerir (info, não aviso) a tecnologia que falta em container ou componente', () => {
        const data = {
          ...completeContainer,
          nodes: completeContainer.nodes.map((n) =>
            n.id === 'c1' ? node('c1', 'c4-container', 'API', { description: 'Regras' }) : n
          ),
        };

        expect(validateDiagram('container', { context: completeContext, container: data })).toEqual([
          {
            code: 'MISSING_TECHNOLOGY',
            severity: 'info',
            nodeId: 'c1',
            message: '"API" não informa a tecnologia (a notação C4 pede a tecnologia de containers e componentes).',
          },
        ]);
      });

      it('deve sugerir a tecnologia da relação nos níveis de Container e Componente, mas não no Contexto', () => {
        const data = {
          ...completeContainer,
          edges: completeContainer.edges.map((e) =>
            e.id === 'e2' ? edge('e2', 'c1', 'd1', { label: 'Lê e grava' }) : e
          ),
        };

        expect(validateDiagram('container', { context: completeContext, container: data })).toEqual([
          {
            code: 'RELATIONSHIP_WITHOUT_TECHNOLOGY',
            severity: 'info',
            edgeId: 'e2',
            message: 'A relação "Lê e grava" de "API" para "Banco de Dados" não informa a tecnologia ou o protocolo.',
          },
        ]);
        expect(codes(validateDiagram('context', { context: completeContext }))).not.toContain(
          'RELATIONSHIP_WITHOUT_TECHNOLOGY'
        );
      });

      it('deve sugerir a descrição que falta (info)', () => {
        const data = {
          ...completeContext,
          nodes: completeContext.nodes.map((n) => (n.id === 'p1' ? node('p1', 'c4-person', 'Cliente') : n)),
        };

        expect(validateDiagram('context', { context: data })).toEqual([
          { code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'p1', message: '"Cliente" não tem descrição.' },
        ]);
      });
    });

    describe('avisos entre níveis (coerência do modelo)', () => {
      it('não deve apontar nada quando o nível de Containers detalha um Contexto coerente', () => {
        expect(validateDiagram('container', { context: completeContext, container: completeContainer })).toEqual([]);
      });

      it('deve avisar quando o nível acima ainda está vazio, sem comparar os elementos', () => {
        expect(validateDiagram('container', { container: completeContainer })).toEqual([
          {
            code: 'PARENT_LEVEL_EMPTY',
            severity: 'warning',
            message: 'O diagrama de Contexto ainda está vazio: o de Containers detalha um sistema dele.',
          },
        ]);
      });

      it('deve avisar quando o Contexto não tem o Sistema de Software que os containers detalham', () => {
        const context = { nodes: completeContext.nodes.filter((n) => n.type !== 'c4-system'), edges: [] };

        expect(codes(validateDiagram('container', { context, container: completeContainer }))).toContain(
          'PARENT_LEVEL_WITHOUT_FOCUS'
        );
      });

      it('deve avisar pessoa ou sistema externo que não aparece no Contexto (mesmo nome e tipo)', () => {
        const container = {
          ...completeContainer,
          nodes: [
            ...completeContainer.nodes,
            node('p2', 'c4-person', 'Administrador', { description: 'Gerencia' }),
            node('x2', 'c4-system-external', '  gateway DE pagamento ', { description: 'Mesmo, outro jeito' }),
          ],
          edges: [
            ...completeContainer.edges,
            edge('e4', 'p2', 'c1', { technology: 'HTTPS' }),
            edge('e5', 'c1', 'x2', { technology: 'HTTPS' }),
          ],
        };

        expect(validateDiagram('container', { context: completeContext, container })).toEqual([
          {
            code: 'MISSING_IN_PARENT_LEVEL',
            severity: 'warning',
            nodeId: 'p2',
            message: '"Administrador" (Pessoa) não aparece no diagrama de Contexto.',
          },
        ]);
      });

      it('deve comparar o nível de Componente com o de Containers (containers vizinhos inclusive)', () => {
        const component = {
          nodes: [
            node('k1', 'c4-component', 'Controlador de Pedidos', { description: 'Recebe pedidos', technology: 'Express' }),
            node('d1', 'c4-container-db', 'Banco de Dados', { description: 'Pedidos', technology: 'PostgreSQL' }),
            node('c9', 'c4-container', 'Fila de Mensagens', { description: 'Eventos', technology: 'RabbitMQ' }),
          ],
          edges: [edge('e1', 'k1', 'd1', { technology: 'SQL' }), edge('e2', 'k1', 'c9', { technology: 'AMQP' })],
        };

        expect(validateDiagram('component', { container: completeContainer, component })).toEqual([
          {
            code: 'MISSING_IN_PARENT_LEVEL',
            severity: 'warning',
            nodeId: 'c9',
            message: '"Fila de Mensagens" (Container) não aparece no diagrama de Containers.',
          },
        ]);
      });

      it('deve avisar quando o nível de Containers não tem o container que os componentes detalham', () => {
        const container = {
          nodes: [node('d1', 'c4-container-db', 'Banco', { description: 'Dados', technology: 'PostgreSQL' })],
          edges: [],
        };
        const component = {
          nodes: [node('k1', 'c4-component', 'Controlador', { description: 'Recebe', technology: 'Express' })],
          edges: [],
        };

        expect(codes(validateDiagram('component', { container, component }))).toEqual(['PARENT_LEVEL_WITHOUT_FOCUS']);
      });
    });
  });
});
