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
