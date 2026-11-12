import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from './api';
import { createShareLink, getShareLink, getSharedProject, revokeShareLink, shareUrl } from './share';
import { InvalidProjectIdError } from './projects';

vi.mock('./api');

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const TOKEN = 'abcDEF123_-abcDEF123_-abcDEF1234';

describe('share service (link de visualização)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve consultar, criar e revogar o link do projeto', async () => {
    api.get.mockResolvedValue({ data: { token: null } });
    api.post.mockResolvedValue({ data: { token: TOKEN } });
    api.delete.mockResolvedValue({ status: 204 });

    expect(await getShareLink(PROJECT_ID)).toEqual({ token: null });
    expect(await createShareLink(PROJECT_ID)).toEqual({ token: TOKEN });
    await revokeShareLink(PROJECT_ID);

    expect(api.get).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/share`);
    expect(api.post).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/share`);
    expect(api.delete).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/share`);
  });

  it('deve recusar id de projeto inválido sem chamar a API', async () => {
    await expect(getShareLink('../auth')).rejects.toBeInstanceOf(InvalidProjectIdError);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('deve abrir o projeto pelo código do link, sem deixar o código mudar o caminho da API', async () => {
    api.get.mockResolvedValue({ data: { name: 'Loja Online' } });

    expect(await getSharedProject(TOKEN)).toEqual({ name: 'Loja Online' });
    expect(api.get).toHaveBeenCalledWith(`/shared/${TOKEN}`);

    await getSharedProject('../projects');
    expect(api.get).toHaveBeenLastCalledWith('/shared/..%2Fprojects');
  });

  it('deve montar o endereço do link no próprio site', () => {
    expect(shareUrl(TOKEN)).toBe(`${window.location.origin}/compartilhado/${TOKEN}`);
  });
});
