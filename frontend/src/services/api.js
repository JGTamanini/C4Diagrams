import axios from 'axios';
import { getToken, clearSession } from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

let unauthorizedHandler = null;

// Nota: registrado pelo ProtectedRoute para redirecionar via React Router quando a sessão expira
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

// Anexa o JWT automaticamente em toda requisição autenticada.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nota: só trata 401 de requisições que levavam token — o 401 de senha errada no login segue para a tela
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = Boolean(error.config?.headers?.Authorization);

    if (error.response?.status === 401 && sentToken) {
      clearSession();
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export default api;
