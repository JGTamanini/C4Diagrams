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

// --- Caminho de volta depois de entrar (link de visualização) ---
// Nota: quem abre um link sem estar logado passa pelo login e, às vezes, pelo cadastro e pela confirmação do e-mail,
// que abre em outra aba. O caminho de origem fica guardado no navegador (não no estado da tela, que se perderia nessas
// trocas) por até 24 horas, o prazo do link de confirmação. Só caminhos do próprio site: "//site.com" ou "https://..."
// levariam para fora (redirecionamento aberto).
const RETURN_KEY = 'returnTo';
const RETURN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isSafeReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}

export function rememberReturnPath(path) {
  if (!isSafeReturnPath(path)) return;
  localStorage.setItem(RETURN_KEY, JSON.stringify({ path, at: Date.now() }));
}

// O caminho guardado, se ainda válido, sem apagar (a página de confirmação só mostra o link)
export function peekReturnPath() {
  try {
    const { path, at } = JSON.parse(localStorage.getItem(RETURN_KEY));
    return isSafeReturnPath(path) && Date.now() - at <= RETURN_MAX_AGE_MS ? path : null;
  } catch {
    return null;
  }
}

// O caminho guardado, uma vez só: depois de usado, um login futuro não volta a um link antigo
export function takeReturnPath() {
  const path = peekReturnPath();
  localStorage.removeItem(RETURN_KEY);
  return path;
}
