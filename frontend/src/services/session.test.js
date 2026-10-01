import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, getToken, getUser, clearSession, hasActiveSession } from './session';
import { fakeJwt } from '../test/fakeJwt';

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

  it('deve salvar só o token quando o usuário não vier, limpando um usuário anterior', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Sessão anterior', email: 'antigo@example.com' }));

    saveSession('header.payload.signature', undefined);

    expect(getToken()).toBe('header.payload.signature');
    expect(getUser()).toBeNull();
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

  describe('hasActiveSession', () => {
    it('deve ser falso sem token', () => {
      expect(hasActiveSession()).toBe(false);
    });

    it('deve ser verdadeiro com token dentro da validade', () => {
      localStorage.setItem('token', fakeJwt({ expiresInSeconds: 60 }));

      expect(hasActiveSession()).toBe(true);
    });

    it('deve ser falso com token expirado', () => {
      localStorage.setItem('token', fakeJwt({ expiresInSeconds: -60 }));

      expect(hasActiveSession()).toBe(false);
    });

    it('deve ser falso com token malformado', () => {
      localStorage.setItem('token', 'nao-e-um-jwt');

      expect(hasActiveSession()).toBe(false);
    });

    it('deve deixar a decisão para o servidor quando o token não tiver exp', () => {
      localStorage.setItem('token', fakeJwt({ withExp: false }));

      expect(hasActiveSession()).toBe(true);
    });
  });
});
