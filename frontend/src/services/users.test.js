import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from './api';
import { deleteAccount } from './users';

vi.mock('./api');

describe('users service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve excluir a conta enviando a senha atual no corpo do DELETE', async () => {
    api.delete.mockResolvedValue({ status: 204 });

    await deleteAccount('Senha@12345');

    expect(api.delete).toHaveBeenCalledWith('/users/me', { data: { password: 'Senha@12345' } });
  });
});
