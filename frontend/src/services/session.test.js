import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSession,
  getToken,
  getUser,
  clearSession,
  hasActiveSession,
  rememberReturnPath,
  peekReturnPath,
  takeReturnPath,
} from './session';
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

  // Link de visualização: quem chega sem login volta ao link depois de entrar ou de se cadastrar, mesmo passando pelo
  // cadastro e pela aba nova que o link de confirmação do e-mail abre
  describe('caminho de volta depois de entrar', () => {
    it('deve guardar um caminho do próprio site e entregá-lo uma vez só', () => {
      rememberReturnPath('/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234');

      expect(peekReturnPath()).toBe('/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234');
      expect(takeReturnPath()).toBe('/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234');
      expect(takeReturnPath()).toBeNull();
    });

    it.each(['//site-externo.com', 'https://site-externo.com', '/\\site-externo.com', 'projetos', ''])(
      'deve ignorar o que não for caminho do próprio site (%s)',
      (path) => {
        rememberReturnPath(path);

        expect(takeReturnPath()).toBeNull();
      }
    );

    it('deve descartar um caminho guardado há mais de 24 horas', () => {
      vi.useFakeTimers();
      try {
        rememberReturnPath('/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234');
        vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

        expect(takeReturnPath()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('deve devolver null quando o valor guardado estiver corrompido', () => {
      localStorage.setItem('returnTo', 'não é json');

      expect(takeReturnPath()).toBeNull();
    });
  });
});
