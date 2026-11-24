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
  beforeEach(() => {
    localStorage.clear();
  });

  // Sonar S8475: só o token vai para o navegador; nome e e-mail são lidos do próprio token (assinado pelo servidor)
  it('deve salvar só o token e ler nome e e-mail dele, com acentos', () => {
    const token = fakeJwt({ name: 'João Tamanini' });

    saveSession(token);

    expect(getToken()).toBe(token);
    expect(getUser()).toEqual({ name: 'João Tamanini', email: 'joao@example.com' });
    expect(Object.keys(localStorage)).toEqual(['token']);
  });

  it('deve apagar o usuário que versões anteriores gravavam à parte', () => {
    localStorage.setItem('user', JSON.stringify({ name: 'Sessão anterior', email: 'antigo@example.com' }));

    saveSession(fakeJwt({ name: 'João Tamanini' }));

    expect(localStorage.getItem('user')).toBeNull();
  });

  it.each([['sem pontos'], ['a.b'], ['a.b.c<script>'], [''], [undefined], [{ token: 'x' }]])(
    'deve recusar um token fora do formato JWT sem gravar nada: %s',
    (token) => {
      expect(() => saveSession(token)).toThrow('Token inválido recebido do servidor.');

      expect(getToken()).toBeNull();
      expect(getUser()).toBeNull();
    }
  );

  it('deve retornar null quando não houver sessão', () => {
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  // Tokens emitidos antes de o nome entrar no token, ou ilegíveis: sem usuário, e o cabeçalho mostra só o "Sair"
  it.each([[fakeJwt()], ['header.payload.signature']])('deve retornar null quando o token não tiver nome e e-mail legíveis: %s', (token) => {
    localStorage.setItem('token', token);

    expect(getUser()).toBeNull();
  });

  it('deve limpar o token e o usuário antigo juntos', () => {
    saveSession(fakeJwt({ name: 'João Tamanini' }));
    localStorage.setItem('user', '{}');

    clearSession();

    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
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
    // Review da #80: quem sai da conta (ou outra pessoa no mesmo navegador) não pode cair no link de antes
    it('sair da conta deve esquecer o caminho guardado', () => {
      rememberReturnPath('/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234');

      clearSession();

      expect(takeReturnPath()).toBeNull();
    });

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
