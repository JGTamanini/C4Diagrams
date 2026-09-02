jest.mock('../../src/repositories/user.repository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const userRepository = require('../../src/repositories/user.repository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authService = require('../../src/services/auth.service');
const { InvalidCredentialsError, AccountLockedError } = require('../../src/errors/auth.errors');

describe('AuthService', () => {
  const credentials = { email: 'joao@example.com', password: 'Senha@12345' };

  const mockUser = {
    id: 'uuid-mock',
    name: 'João Tamanini',
    email: credentials.email,
    password_hash: 'hashed_password_mock',
    failed_login_attempts: 0,
    locked_until: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve autenticar com sucesso e retornar token + dados do usuário', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-jwt-token');

      const result = await authService.login(credentials);

      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password_hash);
      expect(userRepository.resetFailedAttempts).toHaveBeenCalledWith(mockUser.id);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        expect.any(String),
        expect.objectContaining({ expiresIn: expect.any(String) })
      );
      expect(result.token).toBe('fake-jwt-token');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('deve rejeitar quando o e-mail não existe', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);

      await expect(authService.login(credentials)).rejects.toThrow(InvalidCredentialsError);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando a senha está incorreta e incrementar tentativas', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      userRepository.incrementFailedAttempts.mockResolvedValue(1);

      await expect(authService.login(credentials)).rejects.toThrow(InvalidCredentialsError);
      expect(userRepository.incrementFailedAttempts).toHaveBeenCalledWith(mockUser.id);
    });

    it('deve bloquear a conta ao atingir 10 tentativas incorretas', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);
      userRepository.incrementFailedAttempts.mockResolvedValue(10);

      await expect(authService.login(credentials)).rejects.toThrow(InvalidCredentialsError);
      expect(userRepository.lockAccount).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(Date)
      );
    });

    it('deve rejeitar login quando a conta está bloqueada, sem checar a senha', async () => {
      const lockedUser = {
        ...mockUser,
        locked_until: new Date(Date.now() + 3 * 60 * 1000), // bloqueado por mais 3min
      };
      userRepository.findByEmail.mockResolvedValue(lockedUser);

      await expect(authService.login(credentials)).rejects.toThrow(AccountLockedError);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('deve permitir login normalmente quando o bloqueio já expirou', async () => {
      const previouslyLockedUser = {
        ...mockUser,
        locked_until: new Date(Date.now() - 60 * 1000), // expirou há 1min
      };
      userRepository.findByEmail.mockResolvedValue(previouslyLockedUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-jwt-token');

      const result = await authService.login(credentials);

      expect(result.token).toBe('fake-jwt-token');
    });
  });
});