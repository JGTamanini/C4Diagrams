// Utilitário de teste: JWT com payload real (exp, e-mail e nome) e assinatura falsa — o cliente só lê o payload, quem
// valida a assinatura é o servidor. O payload vai em UTF-8, como o servidor gera (nomes com acento)
function base64Url(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCodePoint(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function fakeJwt({ expiresInSeconds = 3600, withExp = true, name, email = 'joao@example.com' } = {}) {
  const payload = { id: 'u1', email };
  if (name !== undefined) payload.name = name;
  if (withExp) payload.exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.assinatura-falsa`;
}
