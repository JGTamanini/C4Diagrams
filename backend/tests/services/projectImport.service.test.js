jest.mock('../../src/repositories/project.repository');

const projectRepository = require('../../src/repositories/project.repository');
const { importProject, PROJECT_FILE_FORMAT, PROJECT_FILE_VERSION } = require('../../src/services/projectImport.service');
const { InvalidImportFileError } = require('../../src/errors/project.errors');
const { MissingFieldError } = require('../../src/errors/user.errors');
const c4Validation = require('../../src/services/c4.validation');
const { normalizeDiagramData } = require('../../src/services/diagram.validation');
const exampleProject = require('../../../frontend/src/constants/exampleProject.json');

const userId = '8f14e45f-ceea-467a-9575-6f1c8e3b2a10';
const node = (id, type, label) => ({ id, type, position: { x: 0, y: 0 }, data: { label } });

const contextData = {
  nodes: [node('n1', 'c4-person', 'Cliente'), { ...node('n2', 'c4-system', 'Loja'), selected: true }],
  edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' }],
};

function file(overrides = {}) {
  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    project: { name: '  Loja Online  ', description: 'E-commerce' },
    diagrams: { context: contextData },
    ...overrides,
  };
}

describe('importProject (RF21: projeto a partir de um arquivo; RF15: projeto de exemplo)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    projectRepository.createWithDiagrams.mockResolvedValue({ id: 'p1', name: 'Loja Online' });
  });

  it('deve criar o projeto com os níveis do arquivo, normalizados como no salvamento', async () => {
    const created = await importProject(userId, file());

    expect(created).toEqual({ id: 'p1', name: 'Loja Online' });
    expect(projectRepository.createWithDiagrams).toHaveBeenCalledWith(userId, { name: 'Loja Online', description: 'E-commerce' }, [
      {
        level: 'context',
        data: {
          nodes: [node('n1', 'c4-person', 'Cliente'), node('n2', 'c4-system', 'Loja')],
          edges: [{ id: 'e1', source: 'n1', target: 'n2', label: 'Compra em' }],
        },
      },
    ]);
  });

  it('deve gravar os níveis na ordem do C4 e pular os vazios (RN10)', async () => {
    const containerData = { nodes: [node('c1', 'c4-container', 'API')], edges: [] };

    await importProject(userId, file({ diagrams: { container: containerData, component: { nodes: [], edges: [] }, context: contextData } }));

    const levels = projectRepository.createWithDiagrams.mock.calls[0][2].map((diagram) => diagram.level);
    expect(levels).toEqual(['context', 'container']);
  });

  it('deve aceitar um projeto sem diagramas', async () => {
    await importProject(userId, file({ diagrams: undefined }));

    expect(projectRepository.createWithDiagrams).toHaveBeenCalledWith(userId, expect.any(Object), []);
  });

  it.each([
    ['arquivo vazio', null],
    ['formato de outro programa', file({ format: 'drawio' })],
    ['versão desconhecida', file({ version: 2 })],
    ['diagramas que não são um objeto', file({ diagrams: [contextData] })],
  ])('deve recusar %s, sem gravar nada', async (_, content) => {
    await expect(importProject(userId, content)).rejects.toThrow(InvalidImportFileError);
    expect(projectRepository.createWithDiagrams).not.toHaveBeenCalled();
  });

  it('deve recusar nível desconhecido, dizendo qual', async () => {
    await expect(importProject(userId, file({ diagrams: { code: contextData } }))).rejects.toThrow('Nível "code" desconhecido');
  });

  it('deve dizer em qual nível está o problema de estrutura', async () => {
    const broken = { nodes: [node('n1', 'c4-person', '')], edges: [] };

    await expect(importProject(userId, file({ diagrams: { context: broken } }))).rejects.toThrow(
      /^Nível Contexto: Elemento "n1": o título é obrigatório\.$/
    );
  });

  it('deve recusar elemento que não pertence ao nível (RN08), como o salvamento', async () => {
    const wrong = { nodes: [node('c1', 'c4-container', 'API')], edges: [] };

    await expect(importProject(userId, file({ diagrams: { context: wrong } }))).rejects.toThrow(
      /^Nível Contexto: "API" \(Container\) não pertence/
    );
  });

  it('deve exigir o nome do projeto, como na criação', async () => {
    await expect(importProject(userId, file({ project: { name: '   ' } }))).rejects.toThrow(MissingFieldError);
  });

  describe('projeto de exemplo que vem com o sistema (RF15)', () => {
    it('deve ser aceito pela importação, com os três níveis', async () => {
      await importProject(userId, exampleProject);

      const diagrams = projectRepository.createWithDiagrams.mock.calls[0][2];
      expect(diagrams.map((diagram) => diagram.level)).toEqual(['context', 'container', 'component']);
    });

    it('não deve ter nenhum problema no motor de validação, nem aviso, em nenhum nível', () => {
      const diagramsByLevel = Object.fromEntries(
        Object.entries(exampleProject.diagrams).map(([level, data]) => [level, normalizeDiagramData(data)])
      );

      for (const level of Object.keys(diagramsByLevel)) {
        expect(c4Validation.validateDiagram(level, diagramsByLevel)).toEqual([]);
      }
    });
  });
});
