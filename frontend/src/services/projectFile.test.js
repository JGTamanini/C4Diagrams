import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildProjectFile, fileNameFor, downloadProjectFile, readProjectFile, levelsWithErrors } from './projectFile';
import EXAMPLE_PROJECT from '../constants/exampleProject.json';
import { LEVEL_ELEMENTS, LEVEL_IDS } from '../constants/c4Notation';

const project = { id: 'p1', name: 'Loja Online', description: 'E-commerce' };
const diagramsByLevel = {
  context: {
    nodes: [{ id: 'n1', type: 'c4-person', position: { x: 1, y: 2 }, data: { label: 'Cliente', description: '' }, selected: true }],
    edges: [],
  },
  container: {
    nodes: [
      { id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API', technology: 'Node.js' } },
      { id: 'd1', type: 'c4-container-db', position: { x: 0, y: 200 }, data: { label: 'Banco' } },
    ],
    edges: [{ id: 'e1', source: 'c1', target: 'd1', label: 'Lê e grava', data: { technology: 'SQL' } }],
  },
  component: { nodes: [], edges: [] },
};

describe('arquivo do projeto (RF21)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve montar o arquivo com o projeto e os níveis com conteúdo, no formato da API', () => {
    expect(buildProjectFile(project, diagramsByLevel)).toEqual({
      format: 'c4diagrams',
      version: 1,
      project: { name: 'Loja Online', description: 'E-commerce' },
      diagrams: {
        context: { nodes: [{ id: 'n1', type: 'c4-person', position: { x: 1, y: 2 }, data: { label: 'Cliente' } }], edges: [] },
        container: {
          nodes: [
            { id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API', technology: 'Node.js' } },
            { id: 'd1', type: 'c4-container-db', position: { x: 0, y: 200 }, data: { label: 'Banco' } },
          ],
          edges: [{ id: 'e1', source: 'c1', target: 'd1', label: 'Lê e grava', technology: 'SQL' }],
        },
      },
    });
  });

  it.each([
    ['Loja Online', 'loja-online.c4diagrams.json'],
    ['Loja Online (exemplo)', 'loja-online-exemplo.c4diagrams.json'],
    ['  Café & Pão: versão 2 ', 'cafe-pao-versao-2.c4diagrams.json'],
    ['???', 'projeto.c4diagrams.json'],
  ])('deve dar ao arquivo um nome seguro a partir do projeto (%s)', (name, fileName) => {
    expect(fileNameFor(name)).toBe(fileName);
  });

  it('deve baixar o arquivo com o nome do projeto', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:arquivo');
    globalThis.URL.revokeObjectURL = vi.fn();

    downloadProjectFile(project, diagramsByLevel);

    const anchor = click.mock.contexts[0];
    expect(anchor.download).toBe('loja-online.c4diagrams.json');
    expect(anchor.href).toBe('blob:arquivo');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:arquivo');
  });

  it('deve ler o conteúdo do arquivo escolhido', async () => {
    const file = new File([JSON.stringify({ format: 'c4diagrams' })], 'loja.json', { type: 'application/json' });

    expect(await readProjectFile(file)).toEqual({ format: 'c4diagrams' });
  });

  it('deve avisar quando o arquivo não é JSON', async () => {
    const file = new File(['não é json'], 'loja.json');

    await expect(readProjectFile(file)).rejects.toThrow('O arquivo escolhido não é um projeto do C4Diagrams (JSON inválido).');
  });

  describe('levelsWithErrors (o que a importação recusaria)', () => {
    const empty = { nodes: [], edges: [] };

    it('não deve apontar nível sem erro', () => {
      expect(levelsWithErrors(diagramsByLevel)).toEqual([]);
    });

    it('deve apontar elemento fora do nível e relação repetida em qualquer sentido', () => {
      const wrongType = { nodes: [{ id: 'c1', type: 'c4-container', position: { x: 0, y: 0 }, data: { label: 'API' } }], edges: [] };
      const repeated = {
        nodes: diagramsByLevel.container.nodes,
        edges: [
          { id: 'e1', source: 'c1', target: 'd1', label: 'Lê' },
          { id: 'e2', source: 'd1', target: 'c1', label: 'Devolve' },
        ],
      };

      expect(levelsWithErrors({ context: wrongType, container: repeated, component: empty })).toEqual(['Contexto', 'Container']);
    });
  });

  it('deve trazer um exemplo com os três níveis, só com elementos permitidos em cada um (RF15)', () => {
    expect(EXAMPLE_PROJECT.format).toBe('c4diagrams');
    expect(Object.keys(EXAMPLE_PROJECT.diagrams)).toEqual(LEVEL_IDS);
    for (const level of LEVEL_IDS) {
      const { nodes, edges } = EXAMPLE_PROJECT.diagrams[level];
      expect(nodes.length).toBeGreaterThan(0);
      expect(edges.length).toBeGreaterThan(0);
      expect(nodes.every((node) => LEVEL_ELEMENTS[level].includes(node.type))).toBe(true);
    }
  });
});
