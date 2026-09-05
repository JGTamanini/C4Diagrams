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
});