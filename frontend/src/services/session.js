const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Três partes em base64url separadas por ponto: o formato de um JWT (a assinatura é conferida pelo servidor)
const JWT_FORMAT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/;
// Mesmo tamanho das colunas name e email da tabela users
const USER_FIELD_MAX_LENGTH = 255;

function isUserField(value) {
  return typeof value === 'string' && value.length <= USER_FIELD_MAX_LENGTH;
}

// Só nome e e-mail, e só quando são textos do tamanho esperado; qualquer outra coisa não vai para o navegador
function storableUser(user) {
  if (!isUserField(user?.name) || !isUserField(user?.email)) return null;
  return { name: user.name, email: user.email };
}

// Nota: único ponto que conhece as chaves do localStorage — login, verificação de e-mail, logout e 401 passam por aqui.
// O que vem da API é conferido antes de ser gravado (Sonar S8475): token fora do formato JWT é recusado sem gravar nada
export function saveSession(token, user) {
  if (typeof token !== 'string' || !JWT_FORMAT_REGEX.test(token)) {
    throw new Error('Token inválido recebido do servidor.');
  }
  localStorage.setItem(TOKEN_KEY, token);

  // Nota: sem usuário válido na resposta, o login segue válido; remove o de uma sessão anterior para não exibir dados alheios
  const safeUser = storableUser(user);
  if (safeUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
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

// Sair também esquece o caminho de volta: a próxima pessoa neste navegador não cai no link de quem saiu
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  forgetReturnPath();
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

export function forgetReturnPath() {
  localStorage.removeItem(RETURN_KEY);
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
  forgetReturnPath();
  return path;
}
