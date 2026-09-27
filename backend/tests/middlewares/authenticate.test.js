const jwt = require('jsonwebtoken');
const authenticate = require('../../src/middlewares/authenticate');
const { UnauthorizedError } = require('../../src/errors/auth.errors');

const TEST_SECRET = 'segredo-de-teste';
const payload = { id: '8f14e45f-ceea-467a-9575-6f1c8e3b2a10', email: 'usuario@example.com' };

function signToken(overrides = {}, secret = TEST_SECRET, options = {}) {
  return jwt.sign({ ...payload, ...overrides }, secret, { expiresIn: '1h', ...options });
}

function base64Url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function mockReq(authorization) {
  return { headers: authorization === undefined ? {} : { authorization } };
}

describe('authenticate', () => {
  let originalSecret;
  let warnSpy;

  beforeAll(() => {
    originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function expectUnauthorized(next, message) {
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe(message);
  }

  const MISSING_MESSAGE = 'Autenticação necessária. Faça login para continuar.';
  const INVALID_MESSAGE = 'Sessão inválida ou expirada. Faça login novamente.';

  describe('token ausente ou malformado', () => {
    it('deve rejeitar quando o header Authorization não for enviado', () => {
      const next = jest.fn();

      authenticate(mockReq(), {}, next);

      expectUnauthorized(next, MISSING_MESSAGE);
    });

    it('deve rejeitar quando o esquema não for Bearer', () => {
      const next = jest.fn();

      authenticate(mockReq(`Basic ${signToken()}`), {}, next);

      expectUnauthorized(next, MISSING_MESSAGE);
    });

    it('deve rejeitar quando o header for Bearer sem token', () => {
      const next = jest.fn();

      authenticate(mockReq('Bearer '), {}, next);

      expectUnauthorized(next, MISSING_MESSAGE);
    });
  });

  describe('token inválido ou expirado', () => {
    it('deve rejeitar token assinado com outro segredo', () => {
      const next = jest.fn();

      authenticate(mockReq(`Bearer ${signToken({}, 'outro-segredo')}`), {}, next);

      expectUnauthorized(next, INVALID_MESSAGE);
    });

    it('deve rejeitar token expirado', () => {
      const next = jest.fn();
      const expired = signToken({}, TEST_SECRET, { expiresIn: -60 });

      authenticate(mockReq(`Bearer ${expired}`), {}, next);

      expectUnauthorized(next, INVALID_MESSAGE);
    });

    it('deve rejeitar token sem assinatura (alg: none)', () => {
      const next = jest.fn();
      const unsigned = `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.`;

      authenticate(mockReq(`Bearer ${unsigned}`), {}, next);

      expectUnauthorized(next, INVALID_MESSAGE);
    });

    it('deve rejeitar token assinado com algoritmo diferente de HS256, mesmo com o segredo correto', () => {
      const next = jest.fn();
      const hs512 = signToken({}, TEST_SECRET, { algorithm: 'HS512' });

      authenticate(mockReq(`Bearer ${hs512}`), {}, next);

      expectUnauthorized(next, INVALID_MESSAGE);
    });

    it('deve registrar a falha no log sem expor o token', () => {
      const next = jest.fn();
      const token = signToken({}, 'outro-segredo');

      authenticate(mockReq(`Bearer ${token}`), {}, next);

      expect(warnSpy).toHaveBeenCalled();
      const logged = warnSpy.mock.calls.flat().map(String).join(' ');
      expect(logged).not.toContain(token);
    });
  });

  describe('erro inesperado', () => {
    it('deve repassar erros que não são do JWT sem convertê-los em 401', () => {
      const unexpected = new Error('falha interna');
      const verifySpy = jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw unexpected;
      });
      const next = jest.fn();

      authenticate(mockReq(`Bearer ${signToken()}`), {}, next);

      expect(next).toHaveBeenCalledWith(unexpected);
      verifySpy.mockRestore();
    });
  });

  describe('token válido', () => {
    it('deve popular req.user apenas com id e email e chamar next sem erro', () => {
      const req = mockReq(`Bearer ${signToken()}`);
      const next = jest.fn();

      authenticate(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ id: payload.id, email: payload.email });
    });

    it('deve aceitar o esquema Bearer sem diferenciar maiúsculas e minúsculas', () => {
      const req = mockReq(`bearer ${signToken()}`);
      const next = jest.fn();

      authenticate(req, {}, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ id: payload.id, email: payload.email });
    });
  });
});
