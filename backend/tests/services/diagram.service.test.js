jest.mock('../../src/repositories/diagram.repository');
jest.mock('../../src/services/project.service');

const diagramRepository = require('../../src/repositories/diagram.repository');
const projectService = require('../../src/services/project.service');
const diagramService = require('../../src/services/diagram.service');
const { ProjectNotFoundError } = require('../../src/errors/project.errors');
const { InvalidDiagramLevelError, InvalidDiagramDataError } = require('../../src/errors/diagram.errors');

describe('DiagramService', () => {
  const userId = '8f14e45f-ceea-467a-9575-6f1c8e3b2a10';
  const projectId = '3b241101-e2bb-4255-8caf-4136c566a962';
  const validData = {
    nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' }, selected: true }],
    edges: [],
  };
  const normalizedData = {
    nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }],
    edges: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listDiagrams', () => {
    it('deve confirmar o acesso ao projeto e retornar os diagramas salvos', async () => {
      projectService.getProject.mockResolvedValue({ id: projectId });
      diagramRepository.findAllByProject.mockResolvedValue([{ level: 'context', data: normalizedData }]);

      const result = await diagramService.listDiagrams(projectId, userId);

      expect(projectService.getProject).toHaveBeenCalledWith(projectId, userId);
      expect(diagramRepository.findAllByProject).toHaveBeenCalledWith(projectId, userId);
      expect(result).toEqual([{ level: 'context', data: normalizedData }]);
    });

    it('deve propagar o 404 do projeto sem consultar os diagramas', async () => {
      projectService.getProject.mockRejectedValue(new ProjectNotFoundError());

      await expect(diagramService.listDiagrams(projectId, userId)).rejects.toThrow(ProjectNotFoundError);
      expect(diagramRepository.findAllByProject).not.toHaveBeenCalled();
    });
  });

  describe('saveDiagram', () => {
    it('deve gravar o documento normalizado do nível', async () => {
      diagramRepository.upsert.mockResolvedValue({ level: 'context', data: normalizedData });

      const result = await diagramService.saveDiagram(projectId, userId, 'context', validData);

      expect(diagramRepository.upsert).toHaveBeenCalledWith(projectId, userId, 'context', normalizedData);
      expect(result).toEqual({ level: 'context', data: normalizedData });
    });

    it('deve lançar ProjectNotFoundError quando nada for gravado (projeto alheio ou inexistente)', async () => {
      diagramRepository.upsert.mockResolvedValue(undefined);

      await expect(diagramService.saveDiagram(projectId, userId, 'context', validData)).rejects.toThrow(
        ProjectNotFoundError
      );
    });

    it('deve lançar ProjectNotFoundError sem consultar o banco quando o id do projeto não for UUID', async () => {
      await expect(diagramService.saveDiagram('abc', userId, 'context', validData)).rejects.toThrow(ProjectNotFoundError);
      expect(diagramRepository.upsert).not.toHaveBeenCalled();
    });

    it('deve lançar InvalidDiagramLevelError para nível fora de context/container/component', async () => {
      await expect(diagramService.saveDiagram(projectId, userId, 'code', validData)).rejects.toThrow(
        InvalidDiagramLevelError
      );
      expect(diagramRepository.upsert).not.toHaveBeenCalled();
    });

    it('deve lançar InvalidDiagramDataError para documento inválido, sem gravar', async () => {
      await expect(diagramService.saveDiagram(projectId, userId, 'context', { nodes: 'x' })).rejects.toThrow(
        InvalidDiagramDataError
      );
      expect(diagramRepository.upsert).not.toHaveBeenCalled();
    });

    describe('canvas vazio (RN10)', () => {
      it('deve confirmar o acesso ao projeto, remover o nível e retornar null', async () => {
        projectService.getProject.mockResolvedValue({ id: projectId });
        diagramRepository.remove.mockResolvedValue(true);

        const result = await diagramService.saveDiagram(projectId, userId, 'container', { nodes: [], edges: [] });

        expect(projectService.getProject).toHaveBeenCalledWith(projectId, userId);
        expect(diagramRepository.remove).toHaveBeenCalledWith(projectId, userId, 'container');
        expect(diagramRepository.upsert).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });

      it('deve propagar o 404 quando o projeto não for do usuário', async () => {
        projectService.getProject.mockRejectedValue(new ProjectNotFoundError());

        await expect(
          diagramService.saveDiagram(projectId, userId, 'container', { nodes: [], edges: [] })
        ).rejects.toThrow(ProjectNotFoundError);
        expect(diagramRepository.remove).not.toHaveBeenCalled();
      });
    });
  });
});
