export const TOKEN_KEY = 'token';
// Versões anteriores gravavam nome e e-mail nesta chave; hoje eles são lidos do token, e a chave só é apagada
const LEGACY_USER_KEY = 'user';

// Três partes em base64url separadas por ponto: o formato de um JWT (a assinatura é conferida pelo servidor)
const JWT_FORMAT_REGEX = /^[\w-]+\.[\w-]+\.[\w-]+$/;

// Nota: único ponto que grava a sessão — login, verificação de e-mail, logout e 401 passam por aqui. Só o token vai
// para o navegador, e só no formato de um JWT (Sonar S8475): fora dele, é recusado sem gravar nada. Nome e e-mail
// vêm do próprio token (getUser), então não há um segundo dado da resposta gravado à parte.
export function saveSession(token) {
  if (typeof token !== 'string' || !JWT_FORMAT_REGEX.test(token)) {
    throw new Error('Token inválido recebido do servidor.');
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Payload do JWT: base64url com o JSON em UTF-8 (o atob devolve bytes; o TextDecoder monta os acentos)
function readPayload(token) {
  const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(base64), (char) => char.codePointAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function readExpiration(token) {
  return readPayload(token).exp;
}

// Nome e e-mail de um token; null quando não dá para ler os dois (token antigo, sem o nome, ou ilegível)
export function userFromToken(token) {
  try {
    const { name, email } = readPayload(token);
    return typeof name === 'string' && typeof email === 'string' ? { name, email } : null;
  } catch {
    return null;
  }
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

// Só para exibir (cabeçalho): quem confere a assinatura e decide o acesso é o servidor
export function getUser() {
  const token = getToken();
  return token ? userFromToken(token) : null;
}

// Sair também esquece o caminho de volta: a próxima pessoa neste navegador não cai no link de quem saiu
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
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
