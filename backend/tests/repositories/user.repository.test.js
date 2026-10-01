const { pool } = require('../../src/config/database');
const userRepository = require('../../src/repositories/user.repository');

describe('UserRepository', () => {
  const testUser = {
    name: 'Test User',
    email: 'test.repository@example.com',
    passwordHash: 'hashed_password_123',
    verificationToken: 'fake-token-abc123',
    verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
  };

  afterEach(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('create', () => {
    it('deve criar um novo usuário e retorná-lo', async () => {
      const createdUser = await userRepository.create(testUser);

      expect(createdUser).toHaveProperty('id');
      expect(createdUser.name).toBe(testUser.name);
      expect(createdUser.email).toBe(testUser.email);
      expect(createdUser.email_verified).toBe(false);
      expect(createdUser).toHaveProperty('created_at');
    });

    it('deve rejeitar a criação com e-mail duplicado', async () => {
      await userRepository.create(testUser);

      await expect(userRepository.create(testUser)).rejects.toThrow();
    });
  });

  describe('findByEmail', () => {
    it('deve retornar o usuário quando o e-mail existe', async () => {
      await userRepository.create(testUser);

      const foundUser = await userRepository.findByEmail(testUser.email);

      expect(foundUser).not.toBeNull();
      expect(foundUser.email).toBe(testUser.email);
    });

    it('deve retornar undefined quando o e-mail não existe', async () => {
      const foundUser = await userRepository.findByEmail('nao.existe@example.com');

      expect(foundUser).toBeUndefined();
    });
  });
  
  describe('incrementFailedAttempts', () => {
    it('deve incrementar failed_login_attempts e retornar o novo valor', async () => {
      const createdUser = await userRepository.create(testUser);

      const attempts = await userRepository.incrementFailedAttempts(createdUser.id);

      expect(attempts).toBe(1);
    });

    it('deve incrementar corretamente em chamadas sucessivas', async () => {
      const createdUser = await userRepository.create(testUser);

      await userRepository.incrementFailedAttempts(createdUser.id);
      await userRepository.incrementFailedAttempts(createdUser.id);
      const attempts = await userRepository.incrementFailedAttempts(createdUser.id);

      expect(attempts).toBe(3);
    });
  });

  describe('resetFailedAttempts', () => {
    it('deve zerar failed_login_attempts e limpar locked_until', async () => {
      const createdUser = await userRepository.create(testUser);
      await userRepository.incrementFailedAttempts(createdUser.id);
      await userRepository.lockAccount(createdUser.id, new Date(Date.now() + 5 * 60 * 1000));

      await userRepository.resetFailedAttempts(createdUser.id);

      const user = await userRepository.findByEmail(testUser.email);
      expect(user.failed_login_attempts).toBe(0);
      expect(user.locked_until).toBeNull();
    });
  });

  describe('lockAccount', () => {
    it('deve definir locked_until com a data informada', async () => {
      const createdUser = await userRepository.create(testUser);
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);

      await userRepository.lockAccount(createdUser.id, lockedUntil);

      const user = await userRepository.findByEmail(testUser.email);
      expect(new Date(user.locked_until).getTime()).toBe(lockedUntil.getTime());
    });
  });

  describe('findByVerificationToken', () => {
    it('deve retornar o usuário quando o token existe', async () => {
      const createdUser = await userRepository.create(testUser);

      const foundUser = await userRepository.findByVerificationToken(testUser.verificationToken);

      expect(foundUser).not.toBeNull();
      expect(foundUser.id).toBe(createdUser.id);
    });

    it('deve retornar undefined quando o token não existe', async () => {
      const foundUser = await userRepository.findByVerificationToken('token-que-nao-existe');

      expect(foundUser).toBeUndefined();
    });
  });

  describe('markEmailAsVerified', () => {
    it('deve marcar email_verified como true e limpar os campos de token', async () => {
      const createdUser = await userRepository.create(testUser);

      await userRepository.markEmailAsVerified(createdUser.id);

      const user = await userRepository.findByEmail(testUser.email);
      expect(user.email_verified).toBe(true);
      expect(user.verification_token).toBeNull();
      expect(user.verification_token_expires_at).toBeNull();
    });
  });

  describe('renewVerificationToken', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const COOLDOWN_MS = 60 * 1000;

    // Simula o último envio feito há `msAgo` (a expiração é sempre envio + 24h)
    async function createUserSentAgo(msAgo) {
      const createdUser = await userRepository.create({
        ...testUser,
        verificationTokenExpiresAt: new Date(Date.now() + DAY_MS - msAgo),
      });
      return createdUser.id;
    }

    function renewArgs(token) {
      return [token, new Date(Date.now() + DAY_MS), new Date(Date.now() + DAY_MS - COOLDOWN_MS)];
    }

    it('deve renovar o token quando o último envio passou do intervalo mínimo', async () => {
      const userId = await createUserSentAgo(2 * 60 * 1000);
      const [token, expiresAt, notSentAfter] = renewArgs('novo-token-verificacao');

      const renewed = await userRepository.renewVerificationToken(userId, token, expiresAt, notSentAfter);

      expect(renewed).toBe(true);
      const user = await userRepository.findByEmail(testUser.email);
      expect(user.verification_token).toBe('novo-token-verificacao');
      expect(new Date(user.verification_token_expires_at).getTime()).toBe(expiresAt.getTime());
    });

    it('não deve renovar dentro do intervalo mínimo', async () => {
      const userId = await createUserSentAgo(30 * 1000);

      const renewed = await userRepository.renewVerificationToken(userId, ...renewArgs('novo-token-verificacao'));

      expect(renewed).toBe(false);
      const user = await userRepository.findByEmail(testUser.email);
      expect(user.verification_token).toBe(testUser.verificationToken);
    });

    it('não deve renovar quando a conta já estiver verificada', async () => {
      const userId = await createUserSentAgo(2 * 60 * 1000);
      await userRepository.markEmailAsVerified(userId);

      const renewed = await userRepository.renewVerificationToken(userId, ...renewArgs('novo-token-verificacao'));

      expect(renewed).toBe(false);
      const user = await userRepository.findByEmail(testUser.email);
      expect(user.verification_token).toBeNull();
    });

    it('deve permitir apenas uma renovação quando duas chegam ao mesmo tempo', async () => {
      const userId = await createUserSentAgo(2 * 60 * 1000);

      const results = await Promise.all([
        userRepository.renewVerificationToken(userId, ...renewArgs('token-requisicao-a')),
        userRepository.renewVerificationToken(userId, ...renewArgs('token-requisicao-b')),
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
      const winner = results[0] ? 'token-requisicao-a' : 'token-requisicao-b';
      const user = await userRepository.findByEmail(testUser.email);
      expect(user.verification_token).toBe(winner);
    });
  });

  describe('setPasswordResetToken', () => {
  it('deve definir o token de recuperação e sua expiração', async () => {
    const createdUser = await userRepository.create(testUser);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await userRepository.setPasswordResetToken(createdUser.id, 'reset-token-abc', expiresAt);

    const user = await userRepository.findByEmail(testUser.email);
    expect(user.password_reset_token).toBe('reset-token-abc');
    expect(new Date(user.password_reset_token_expires_at).getTime()).toBe(expiresAt.getTime());
  });
});

describe('findByPasswordResetToken', () => {
  it('deve retornar o usuário quando o token existe', async () => {
    const createdUser = await userRepository.create(testUser);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await userRepository.setPasswordResetToken(createdUser.id, 'reset-token-abc', expiresAt);

    const foundUser = await userRepository.findByPasswordResetToken('reset-token-abc');

    expect(foundUser).not.toBeNull();
    expect(foundUser.id).toBe(createdUser.id);
  });

  it('deve retornar undefined quando o token não existe', async () => {
    const foundUser = await userRepository.findByPasswordResetToken('token-que-nao-existe');

    expect(foundUser).toBeUndefined();
  });
});

describe('setPasswordResetToken', () => {
  it('deve definir o token de recuperação e sua expiração', async () => {
    const createdUser = await userRepository.create(testUser);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await userRepository.setPasswordResetToken(createdUser.id, 'reset-token-abc', expiresAt);

    const user = await userRepository.findByEmail(testUser.email);
    expect(user.password_reset_token).toBe('reset-token-abc');
    expect(new Date(user.password_reset_token_expires_at).getTime()).toBe(expiresAt.getTime());
  });
});

describe('findByPasswordResetToken', () => {
  it('deve retornar o usuário quando o token existe', async () => {
    const createdUser = await userRepository.create(testUser);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await userRepository.setPasswordResetToken(createdUser.id, 'reset-token-abc', expiresAt);

    const foundUser = await userRepository.findByPasswordResetToken('reset-token-abc');

    expect(foundUser).not.toBeNull();
    expect(foundUser.id).toBe(createdUser.id);
  });

  it('deve retornar undefined quando o token não existe', async () => {
    const foundUser = await userRepository.findByPasswordResetToken('token-que-nao-existe');

    expect(foundUser).toBeUndefined();
  });
});

describe('updatePassword', () => {
  it('deve atualizar a senha, limpar o token e resetar o bloqueio de login', async () => {
    const createdUser = await userRepository.create(testUser);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await userRepository.setPasswordResetToken(createdUser.id, 'reset-token-abc', expiresAt);
    await userRepository.incrementFailedAttempts(createdUser.id);
    await userRepository.lockAccount(createdUser.id, new Date(Date.now() + 5 * 60 * 1000));

    await userRepository.updatePassword(createdUser.id, 'novo_hash_de_senha');

    const user = await userRepository.findByEmail(testUser.email);
    expect(user.password_hash).toBe('novo_hash_de_senha');
    expect(user.password_reset_token).toBeNull();
    expect(user.password_reset_token_expires_at).toBeNull();
    expect(user.failed_login_attempts).toBe(0);
    expect(user.locked_until).toBeNull();
  });
});
});