import { describe, it, expect, beforeEach, vi } from 'vitest';
import api, { onUnauthorized } from './api';

describe('api', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('deve anexar o header Authorization quando há token no localStorage', () => {
    localStorage.setItem('token', 'fake-jwt-token');

    const config = { headers: {} };
    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const result = interceptor(config);

    expect(result.headers.Authorization).toBe('Bearer fake-jwt-token');
  });

  it.each(['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/resend-verification'])(
    'não deve anexar o token nas rotas públicas de autenticação (%s), mesmo com token salvo',
    (url) => {
      localStorage.setItem('token', 'token-vencido');

      const interceptor = api.interceptors.request.handlers[0].fulfilled;
      const result = interceptor({ url, headers: {} });

      expect(result.headers.Authorization).toBeUndefined();
    }
  );

  it('deve anexar o token nas rotas protegidas', () => {
    localStorage.setItem('token', 'fake-jwt-token');

    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const result = interceptor({ url: '/projects', headers: {} });

    expect(result.headers.Authorization).toBe('Bearer fake-jwt-token');
  });

  it('não deve anexar o header Authorization quando não há token', () => {
    const config = { headers: {} };
    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const result = interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('api - interceptor de resposta 401', () => {
  const rejected = () => api.interceptors.response.handlers[0].rejected;

  function httpError(status, withToken) {
    return {
      response: { status },
      config: { headers: withToken ? { Authorization: 'Bearer fake-jwt-token' } : {} },
    };
  }

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('user', JSON.stringify({ name: 'João', email: 'joao@example.com' }));
  });

  it('deve limpar a sessão e acionar o handler quando uma requisição autenticada receber 401', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    const error = httpError(401, true);

    await expect(rejected()(error)).rejects.toBe(error);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('não deve limpar a sessão quando o 401 vier de requisição sem token (ex.: senha errada no login)', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    const error = httpError(401, false);

    await expect(rejected()(error)).rejects.toBe(error);

    expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    expect(handler).not.toHaveBeenCalled();
  });

  it('deve apenas repassar erros que não são 401', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);
    const error = httpError(500, true);

    await expect(rejected()(error)).rejects.toBe(error);

    expect(localStorage.getItem('token')).toBe('fake-jwt-token');
    expect(handler).not.toHaveBeenCalled();
  });

  it('deve repassar respostas de sucesso sem alteração', () => {
    const response = { status: 200, data: [] };

    expect(api.interceptors.response.handlers[0].fulfilled(response)).toBe(response);
  });

  it('deve repassar erros de rede sem resposta', async () => {
    const error = { message: 'Network Error', config: { headers: {} } };

    await expect(rejected()(error)).rejects.toBe(error);
  });

  it('deve limpar a sessão mesmo sem handler registrado', async () => {
    onUnauthorized(null);

    await expect(rejected()(httpError(401, true))).rejects.toBeDefined();

    expect(localStorage.getItem('token')).toBeNull();
  });
});
