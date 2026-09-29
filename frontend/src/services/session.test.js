import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, getToken, getUser, clearSession } from './session';

describe('session', () => {
  const user = { id: '1', name: 'João Tamanini', email: 'joao@example.com' };

  beforeEach(() => {
    localStorage.clear();
  });

  it('deve salvar token e apenas nome e e-mail do usuário', () => {
    saveSession('header.payload.signature', { ...user, email_verified: true });

    expect(getToken()).toBe('header.payload.signature');
    expect(getUser()).toEqual({ name: 'João Tamanini', email: 'joao@example.com' });
  });

  it('deve retornar null quando não houver sessão', () => {
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it('deve retornar null quando o usuário salvo estiver corrompido', () => {
    localStorage.setItem('user', '{json inválido');

    expect(getUser()).toBeNull();
  });

  it('deve limpar token e usuário juntos', () => {
    saveSession('header.payload.signature', user);

    clearSession();

    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });
});
