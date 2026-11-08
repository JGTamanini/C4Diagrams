import { describe, it, expect } from 'vitest';
import { resolveScope, isInnerType, detailLevelOf, SCOPE_TYPE_LABEL } from './levelScope';

const node = (id, type, label) => ({ id, type, position: { x: 0, y: 0 }, data: { label } });

const nodesByLevel = {
  context: [node('p1', 'c4-person', 'Cliente'), node('s1', 'c4-system', 'Loja'), node('x1', 'c4-system-external', 'Gateway')],
  container: [node('c1', 'c4-container', 'API'), node('c2', 'c4-container', 'Web'), node('d1', 'c4-container-db', 'Banco')],
  component: [node('k1', 'c4-component', 'Controlador')],
};
const noScopes = { context: null, container: null, component: null };

describe('foco dos níveis (RF22: o que cada nível detalha do nível acima)', () => {
  it('não deve haver foco no Contexto, o nível mais alto', () => {
    expect(resolveScope('context', nodesByLevel, noScopes)).toBeNull();
  });

  it('deve usar o único candidato do nível acima quando nenhum foi escolhido', () => {
    expect(resolveScope('container', nodesByLevel, noScopes)).toEqual({
      parentLevel: 'context',
      candidates: [nodesByLevel.context[1]],
      focus: nodesByLevel.context[1],
      status: 'implicit',
    });
  });

  it('deve pedir a escolha quando há mais de um candidato', () => {
    expect(resolveScope('component', nodesByLevel, noScopes)).toEqual(
      expect.objectContaining({ candidates: [nodesByLevel.container[0], nodesByLevel.container[1]], focus: null, status: 'ambiguous' })
    );
  });

  it('deve usar o foco escolhido', () => {
    const scope = resolveScope('component', nodesByLevel, { ...noScopes, component: { nodeId: 'c2' } });

    expect(scope).toEqual(expect.objectContaining({ focus: nodesByLevel.container[1], status: 'chosen' }));
  });

  it('deve indicar foco perdido quando o elemento escolhido não existe mais (ou não é candidato)', () => {
    expect(resolveScope('component', nodesByLevel, { ...noScopes, component: { nodeId: 'd1' } })).toEqual(
      expect.objectContaining({ focus: null, status: 'missing' })
    );
  });

  it('deve indicar quando o nível acima não tem candidato', () => {
    expect(resolveScope('container', { ...nodesByLevel, context: [] }, noScopes)).toEqual(
      expect.objectContaining({ candidates: [], focus: null, status: 'none' })
    );
  });

  it('deve dizer quem fica dentro da fronteira de cada nível', () => {
    expect(isInnerType('container', 'c4-container')).toBe(true);
    expect(isInnerType('container', 'c4-container-db')).toBe(true);
    expect(isInnerType('container', 'c4-person')).toBe(false);
    expect(isInnerType('component', 'c4-component')).toBe(true);
    expect(isInnerType('component', 'c4-container')).toBe(false);
    expect(isInnerType('context', 'c4-system')).toBe(false);
  });

  it('deve dizer em qual nível um elemento é detalhado', () => {
    expect(detailLevelOf('context', 'c4-system')).toBe('container');
    expect(detailLevelOf('container', 'c4-container')).toBe('component');
    expect(detailLevelOf('context', 'c4-person')).toBeNull();
    expect(detailLevelOf('container', 'c4-container-db')).toBeNull();
    expect(detailLevelOf('component', 'c4-component')).toBeNull();
  });

  it('deve usar o nome de tipo da notação C4 no rótulo da fronteira', () => {
    expect(SCOPE_TYPE_LABEL).toEqual({ container: 'Software System', component: 'Container' });
  });
});
