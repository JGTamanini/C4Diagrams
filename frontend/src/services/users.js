import api from './api';

// Nota: a senha atual vai no corpo do DELETE — o backend exige a confirmação para excluir a conta. Senha errada
// volta como 403 (não 401), então a sessão não é encerrada pelo interceptador do api.js.
export async function deleteAccount(password) {
  await api.delete('/users/me', { data: { password } });
}
