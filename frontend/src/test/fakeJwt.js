// Utilitário de teste: JWT com payload real (exp) e assinatura falsa — o cliente só lê o exp, quem valida é o servidor
function base64Url(value) {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fakeJwt({ expiresInSeconds = 3600, withExp = true } = {}) {
  const payload = { id: 'u1', email: 'joao@example.com' };
  if (withExp) payload.exp = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.assinatura-falsa`;
}
