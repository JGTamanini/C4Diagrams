import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from './api';
import { listProjects, getProject, createProject, updateProject, deleteProject } from './projects';

vi.mock('./api');

describe('projects service', () => {
  const project = { id: 'p1', name: 'Loja Online', description: null };

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

    const result = await getProject('p1');

    expect(api.get).toHaveBeenCalledWith('/projects/p1');
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

    const result = await updateProject('p1', { name: 'Loja v2' });

    expect(api.patch).toHaveBeenCalledWith('/projects/p1', { name: 'Loja v2' });
    expect(result).toEqual(project);
  });

  it('deve excluir um projeto', async () => {
    api.delete.mockResolvedValue({ status: 204 });

    await deleteProject('p1');

    expect(api.delete).toHaveBeenCalledWith('/projects/p1');
  });
});

describe('projects service - id na URL', () => {
  const maliciousId = '../auth/forgot-password';
  const encoded = '..%2Fauth%2Fforgot-password';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve codificar o id ao buscar, impedindo trocar o endpoint chamado', async () => {
    api.get.mockResolvedValue({ data: {} });

    await getProject(maliciousId);

    expect(api.get).toHaveBeenCalledWith(`/projects/${encoded}`);
  });

  it('deve codificar o id ao atualizar', async () => {
    api.patch.mockResolvedValue({ data: {} });

    await updateProject(maliciousId, { name: 'x' });

    expect(api.patch).toHaveBeenCalledWith(`/projects/${encoded}`, { name: 'x' });
  });

  it('deve codificar o id ao excluir', async () => {
    api.delete.mockResolvedValue({ status: 204 });

    await deleteProject(maliciousId);

    expect(api.delete).toHaveBeenCalledWith(`/projects/${encoded}`);
  });
});
