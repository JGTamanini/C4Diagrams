import { vi, describe, it, expect, beforeEach } from 'vitest';
import api from './api';

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

  it('não deve anexar o header Authorization quando não há token', () => {
    const config = { headers: {} };
    const interceptor = api.interceptors.request.handlers[0].fulfilled;
    const result = interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });
});