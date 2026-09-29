jest.mock('../../src/repositories/project.repository');

const projectRepository = require('../../src/repositories/project.repository');
const projectService = require('../../src/services/project.service');
const { MissingFieldError } = require('../../src/errors/user.errors');
const { ProjectNotFoundError, FieldTooLongError } = require('../../src/errors/project.errors');

describe('ProjectService', () => {
  const userId = '8f14e45f-ceea-467a-9575-6f1c8e3b2a10';
  const projectId = '3b241101-e2bb-4255-8caf-4136c566a962';
  const storedProject = {
    id: projectId,
    name: 'Sistema de Pedidos',
    description: 'Arquitetura do e-commerce',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('deve criar o projeto para o usuário e retorná-lo', async () => {
      projectRepository.create.mockResolvedValue(storedProject);

      const result = await projectService.createProject(userId, {
        name: 'Sistema de Pedidos',
        description: 'Arquitetura do e-commerce',
      });

      expect(projectRepository.create).toHaveBeenCalledWith(userId, {
        name: 'Sistema de Pedidos',
        description: 'Arquitetura do e-commerce',
      });
      expect(result).toEqual(storedProject);
    });

    it('deve remover espaços das pontas do nome antes de salvar', async () => {
      projectRepository.create.mockResolvedValue(storedProject);

      await projectService.createProject(userId, { name: '  Sistema de Pedidos  ' });

      expect(projectRepository.create).toHaveBeenCalledWith(userId, {
        name: 'Sistema de Pedidos',
        description: null,
      });
    });

    it('deve remover espaços das pontas da descrição, preservando quebras de linha internas', async () => {
      projectRepository.create.mockResolvedValue(storedProject);

      await projectService.createProject(userId, {
        name: 'Projeto',
        description: ' Diagrama de contexto\ndo sistema ',
      });

      expect(projectRepository.create).toHaveBeenCalledWith(userId, {
        name: 'Projeto',
        description: 'Diagrama de contexto\ndo sistema',
      });
    });

    it('deve gravar descrição vazia ou só com espaços como null', async () => {
      projectRepository.create.mockResolvedValue(storedProject);

      await projectService.createProject(userId, { name: 'Projeto', description: '   ' });

      expect(projectRepository.create).toHaveBeenCalledWith(userId, { name: 'Projeto', description: null });
    });

    it.each([
      ['ausente', undefined],
      ['vazio', ''],
      ['só com espaços', '   '],
      ['que não é texto', 123],
    ])('deve lançar MissingFieldError quando o nome for %s (RN04)', async (_, name) => {
      await expect(projectService.createProject(userId, { name })).rejects.toThrow(MissingFieldError);
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar FieldTooLongError quando o nome passar de 255 caracteres', async () => {
      await expect(projectService.createProject(userId, { name: 'a'.repeat(256) })).rejects.toThrow(
        FieldTooLongError
      );
      expect(projectRepository.create).not.toHaveBeenCalled();
    });

    it('deve aceitar nome com exatamente 255 caracteres após o trim', async () => {
      projectRepository.create.mockResolvedValue(storedProject);

      await projectService.createProject(userId, { name: ` ${'a'.repeat(255)} ` });

      expect(projectRepository.create).toHaveBeenCalledWith(userId, { name: 'a'.repeat(255), description: null });
    });
  });

  describe('listProjects', () => {
    it('deve retornar os projetos do usuário', async () => {
      projectRepository.findAllByUser.mockResolvedValue([storedProject]);

      const result = await projectService.listProjects(userId);

      expect(projectRepository.findAllByUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual([storedProject]);
    });
  });

  describe('getProject', () => {
    it('deve retornar o projeto quando encontrado', async () => {
      projectRepository.findById.mockResolvedValue(storedProject);

      const result = await projectService.getProject(projectId, userId);

      expect(projectRepository.findById).toHaveBeenCalledWith(projectId, userId);
      expect(result).toEqual(storedProject);
    });

    it('deve lançar ProjectNotFoundError quando o repositório não encontrar o projeto', async () => {
      projectRepository.findById.mockResolvedValue(undefined);

      await expect(projectService.getProject(projectId, userId)).rejects.toThrow(ProjectNotFoundError);
    });

    it('deve lançar ProjectNotFoundError sem consultar o banco quando o id não for UUID', async () => {
      await expect(projectService.getProject('abc', userId)).rejects.toThrow(ProjectNotFoundError);
      expect(projectRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('deve atualizar o projeto com os dados normalizados', async () => {
      projectRepository.update.mockResolvedValue(storedProject);

      const result = await projectService.updateProject(projectId, userId, { name: ' Editado ', description: '' });

      expect(projectRepository.update).toHaveBeenCalledWith(projectId, userId, { name: 'Editado', description: null });
      expect(result).toEqual(storedProject);
    });

    it('deve lançar MissingFieldError quando o nome estiver vazio (RN04)', async () => {
      await expect(projectService.updateProject(projectId, userId, { name: ' ' })).rejects.toThrow(
        MissingFieldError
      );
      expect(projectRepository.update).not.toHaveBeenCalled();
    });

    it('deve lançar FieldTooLongError quando o nome passar de 255 caracteres', async () => {
      await expect(projectService.updateProject(projectId, userId, { name: 'a'.repeat(256) })).rejects.toThrow(
        FieldTooLongError
      );
      expect(projectRepository.update).not.toHaveBeenCalled();
    });

    it('deve lançar ProjectNotFoundError quando o projeto não for do usuário ou não existir', async () => {
      projectRepository.update.mockResolvedValue(undefined);

      await expect(projectService.updateProject(projectId, userId, { name: 'Editado' })).rejects.toThrow(
        ProjectNotFoundError
      );
    });

    it('deve lançar ProjectNotFoundError sem consultar o banco quando o id não for UUID', async () => {
      await expect(projectService.updateProject('abc', userId, { name: 'Editado' })).rejects.toThrow(
        ProjectNotFoundError
      );
      expect(projectRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('deve excluir o projeto do usuário', async () => {
      projectRepository.remove.mockResolvedValue(true);

      await projectService.deleteProject(projectId, userId);

      expect(projectRepository.remove).toHaveBeenCalledWith(projectId, userId);
    });

    it('deve lançar ProjectNotFoundError quando nada for excluído', async () => {
      projectRepository.remove.mockResolvedValue(false);

      await expect(projectService.deleteProject(projectId, userId)).rejects.toThrow(ProjectNotFoundError);
    });

    it('deve lançar ProjectNotFoundError sem consultar o banco quando o id não for UUID', async () => {
      await expect(projectService.deleteProject('abc', userId)).rejects.toThrow(ProjectNotFoundError);
      expect(projectRepository.remove).not.toHaveBeenCalled();
    });
  });
});
