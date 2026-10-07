import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from './api';
import { listProjects, getProject, createProject, updateProject, deleteProject, InvalidProjectIdError } from './projects';

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

vi.mock('./api');

describe('projects service', () => {
  const project = { id: PROJECT_ID, name: 'Loja Online', description: null };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve listar os projetos do usuário', async () => {
    api.get.mockResolvedValue({ data: [project] });

    const result = await listProjects();

    expect(api.get).toHaveBeenCalledWith('/projects');
    expect(result).toEqual([project]);
  });

  it('deve buscar um projeto pelo id', async () => {
    api.get.mockResolvedValue({ data: project });

    const result = await getProject(PROJECT_ID);

    expect(api.get).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
    expect(result).toEqual(project);
  });

  it('deve criar um projeto', async () => {
    api.post.mockResolvedValue({ data: project });

    const result = await createProject({ name: 'Loja Online', description: '' });

    expect(api.post).toHaveBeenCalledWith('/projects', { name: 'Loja Online', description: '' });
    expect(result).toEqual(project);
  });

  it('deve atualizar um projeto via PATCH', async () => {
    api.patch.mockResolvedValue({ data: project });

    const result = await updateProject(PROJECT_ID, { name: 'Loja v2' });

    expect(api.patch).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`, { name: 'Loja v2' });
    expect(result).toEqual(project);
  });

  it('deve excluir um projeto', async () => {
    api.delete.mockResolvedValue({ status: 204 });

    await deleteProject(PROJECT_ID);

    expect(api.delete).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`);
  });
});

describe('projects service - validação do id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['buscar', () => getProject('../auth/forgot-password'), 'get'],
    ['atualizar', () => updateProject('../auth/forgot-password', { name: 'x' }), 'patch'],
    ['excluir', () => deleteProject('../auth/forgot-password'), 'delete'],
  ])('deve recusar id fora do formato UUID ao %s, sem fazer requisição', async (_, call, method) => {
    await expect(call()).rejects.toBeInstanceOf(InvalidProjectIdError);
    expect(api[method]).not.toHaveBeenCalled();
  });
});
