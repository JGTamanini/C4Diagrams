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

    it('deve recusar elemento fora do nível (RN08), sem gravar, explicando o motivo', async () => {
      const data = { nodes: [{ id: 'k1', type: 'c4-component', position: { x: 0, y: 0 }, data: { label: 'Controlador' } }], edges: [] };

      await expect(diagramService.saveDiagram(projectId, userId, 'context', data)).rejects.toThrow(
        new InvalidDiagramDataError('"Controlador" (Componente) não pertence ao diagrama de Contexto.')
      );
      expect(diagramRepository.upsert).not.toHaveBeenCalled();
    });

    it('deve recusar uma segunda relação no mesmo sentido, sem gravar', async () => {
      const data = {
        nodes: [
          { id: 'p1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } },
          { id: 's1', type: 'c4-system', position: { x: 300, y: 0 }, data: { label: 'Loja' } },
        ],
        edges: [
          { id: 'e1', source: 'p1', target: 's1', label: 'Usa' },
          { id: 'e2', source: 'p1', target: 's1', label: 'Compra em' },
        ],
      };

      await expect(diagramService.saveDiagram(projectId, userId, 'context', data)).rejects.toThrow(InvalidDiagramDataError);
      expect(diagramRepository.upsert).not.toHaveBeenCalled();
    });

    it('deve gravar mesmo com avisos (RN11: avisos não bloqueiam)', async () => {
      const onlyExternal = {
        nodes: [{ id: 'x1', type: 'c4-system-external', position: { x: 0, y: 0 }, data: { label: 'Gateway' } }],
        edges: [],
      };
      diagramRepository.upsert.mockResolvedValue({ level: 'context', data: onlyExternal });

      await expect(diagramService.saveDiagram(projectId, userId, 'context', onlyExternal)).resolves.toBeTruthy();
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

  describe('validateDiagram (motor de validação C4 — RF17)', () => {
    const containerData = {
      nodes: [
        { id: 'p1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Administrador', description: 'Gerencia' } },
        { id: 'c1', type: 'c4-container', position: { x: 300, y: 0 }, data: { label: 'API', description: 'Regras', technology: 'Node.js' } },
      ],
      edges: [{ id: 'e1', source: 'p1', target: 'c1', label: 'Usa', technology: 'HTTPS' }],
    };

    it('deve validar o estado enviado comparando com os outros níveis salvos (e não com a versão salva do próprio nível)', async () => {
      projectService.getProject.mockResolvedValue({ id: projectId });
      diagramRepository.findAllByProject.mockResolvedValue([
        { level: 'context', data: { nodes: [{ id: 's1', type: 'c4-system', position: { x: 0, y: 0 }, data: { label: 'Loja', description: 'Vende' } }], edges: [] } },
        { level: 'container', data: { nodes: [], edges: [] } },
      ]);

      const issues = await diagramService.validateDiagram(projectId, userId, 'container', containerData);

      expect(projectService.getProject).toHaveBeenCalledWith(projectId, userId);
      expect(issues).toEqual([
        {
          code: 'MISSING_IN_PARENT_LEVEL',
          severity: 'warning',
          nodeId: 'p1',
          message: '"Administrador" (Pessoa) não aparece no diagrama de Contexto.',
        },
      ]);
      expect(diagramRepository.upsert).not.toHaveBeenCalled();
    });

    it('deve propagar o 404 do projeto sem ler os diagramas', async () => {
      projectService.getProject.mockRejectedValue(new ProjectNotFoundError());

      await expect(diagramService.validateDiagram(projectId, userId, 'container', containerData)).rejects.toThrow(
        ProjectNotFoundError
      );
      expect(diagramRepository.findAllByProject).not.toHaveBeenCalled();
    });

    it('deve recusar nível inválido e documento malformado antes de consultar o projeto', async () => {
      await expect(diagramService.validateDiagram(projectId, userId, 'code', containerData)).rejects.toThrow(
        InvalidDiagramLevelError
      );
      await expect(diagramService.validateDiagram(projectId, userId, 'context', { nodes: 'x' })).rejects.toThrow(
        InvalidDiagramDataError
      );
      expect(projectService.getProject).not.toHaveBeenCalled();
    });
  });
});
