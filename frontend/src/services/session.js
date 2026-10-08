const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Nota: único ponto que conhece as chaves do localStorage — login, logout e 401 passam por aqui
export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);

  // Nota: sem usuário na resposta, o login segue válido; remove o de uma sessão anterior para não exibir dados alheios
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify({ name: user.name, email: user.email }));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function readExpiration(token) {
  const payload = token.split('.')[1];
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json).exp;
}

// Nota: só lê o exp para a navegação não depender de um 401 — a assinatura continua sendo validada pelo servidor.
// Token sem exp fica a cargo do servidor; token ilegível conta como sessão inválida.
export function hasActiveSession() {
  const token = getToken();
  if (!token) return false;

  try {
    const exp = readExpiration(token);
    return exp === undefined || exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
