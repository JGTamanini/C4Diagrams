jest.mock('../../src/repositories/projectShare.repository');

const shareRepository = require('../../src/repositories/projectShare.repository');
const shareService = require('../../src/services/projectShare.service');
const { ProjectNotFoundError, SharedProjectNotFoundError } = require('../../src/errors/project.errors');

describe('ProjectShareService (link de visualização)', () => {
  const userId = '8f14e45f-ceea-467a-9575-6f1c8e3b2a10';
  const projectId = '3b241101-e2bb-4255-8caf-4136c566a962';
  const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dono do projeto', () => {
    it('deve informar o link atual (ou null, sem link)', async () => {
      shareRepository.findToken.mockResolvedValue({ token: null });

      expect(await shareService.getShareLink(projectId, userId)).toEqual({ token: null });
      expect(shareRepository.findToken).toHaveBeenCalledWith(projectId, userId);
    });

    it('deve criar um código aleatório novo a cada vez (trocar o link invalida o anterior)', async () => {
      shareRepository.setToken.mockResolvedValue(true);

      const first = await shareService.createShareLink(projectId, userId);
      const second = await shareService.createShareLink(projectId, userId);

      expect(first.token).toMatch(TOKEN_FORMAT);
      expect(second.token).toMatch(TOKEN_FORMAT);
      expect(second.token).not.toBe(first.token);
      expect(shareRepository.setToken).toHaveBeenLastCalledWith(projectId, userId, second.token);
    });

    it('deve revogar o link', async () => {
      shareRepository.clearToken.mockResolvedValue(true);

      await shareService.revokeShareLink(projectId, userId);

      expect(shareRepository.clearToken).toHaveBeenCalledWith(projectId, userId);
    });

    it.each([
      ['ver', (id) => shareService.getShareLink(id, userId), 'findToken', null],
      ['criar', (id) => shareService.createShareLink(id, userId), 'setToken', false],
      ['revogar', (id) => shareService.revokeShareLink(id, userId), 'clearToken', false],
    ])('deve responder 404 ao %s o link de projeto alheio ou com id inválido (RN02)', async (_, call, method, notOwned) => {
      shareRepository[method].mockResolvedValue(notOwned);

      await expect(call(projectId)).rejects.toThrow(ProjectNotFoundError);
      await expect(call('abc')).rejects.toThrow(ProjectNotFoundError);
      expect(shareRepository[method]).toHaveBeenCalledTimes(1);
    });
  });

  describe('quem abre o link', () => {
    const shared = { name: 'Loja Online', description: null, ownerName: 'Ana', updatedAt: new Date(), diagrams: [] };

    it('deve devolver o projeto do link', async () => {
      shareRepository.findByToken.mockResolvedValue(shared);
      const token = 'A'.repeat(32);

      expect(await shareService.getSharedProject(token)).toBe(shared);
      expect(shareRepository.findByToken).toHaveBeenCalledWith(token);
    });

    it('deve responder link inválido ou revogado, sem consultar o banco quando o código nem tem o formato', async () => {
      shareRepository.findByToken.mockResolvedValue(null);

      await expect(shareService.getSharedProject('B'.repeat(32))).rejects.toThrow(SharedProjectNotFoundError);
      await expect(shareService.getSharedProject('../../etc')).rejects.toThrow(SharedProjectNotFoundError);
      expect(shareRepository.findByToken).toHaveBeenCalledTimes(1);
    });
  });
});
