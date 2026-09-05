jest.mock('../../src/repositories/user.repository');
jest.mock('bcryptjs');
jest.mock('node:crypto');
jest.mock('../../src/services/email.service');

const userRepository = require('../../src/repositories/user.repository');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const emailService = require('../../src/services/email.service');
const userService = require('../../src/services/user.service');
const {
  EmailAlreadyExistsError,
  WeakPasswordError,
  MissingFieldError,
} = require('../../src/errors/user.errors');
const { InvalidOrExpiredTokenError } = require('../../src/errors/token.errors');

describe('UserService', () => {
  const inputData = {
    name: 'João Tamanini',
    email: 'joao@example.com',
    password: 'Senha@12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve registrar um usuário com senha hasheada e token de verificação', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);
      bcrypt.hash.mockResolvedValue('hashed_password_mock');
      crypto.randomBytes.mockReturnValue({ toString: () => 'mocked_token_hex' });
      userRepository.create.mockResolvedValue({
        id: 'uuid-mock',
        name: inputData.name,
        email: inputData.email,
        email_verified: false,
        created_at: new Date(),
      });

      const result = await userService.register(inputData);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(inputData.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(inputData.password, 10);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: inputData.name,
          email: inputData.email,
          passwordHash: 'hashed_password_mock',
          verificationToken: 'mocked_token_hex',
        })
      );
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(inputData.email);
    });

    it('deve rejeitar registro com e-mail já existente', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-uuid', email: inputData.email });

      await expect(userService.register(inputData)).rejects.toThrow(EmailAlreadyExistsError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    // --- Campos obrigatórios ---
    it('deve rejeitar registro sem o campo name', async () => {
      const { name, ...dataSemName } = inputData;
      await expect(userService.register(dataSemName)).rejects.toThrow(MissingFieldError);
    });

    it('deve rejeitar registro sem o campo email', async () => {
      const { email, ...dataSemEmail } = inputData;
      await expect(userService.register(dataSemEmail)).rejects.toThrow(MissingFieldError);
    });

    it('deve rejeitar registro sem o campo password', async () => {
      const { password, ...dataSemPassword } = inputData;
      await expect(userService.register(dataSemPassword)).rejects.toThrow(WeakPasswordError);
    });

    // --- Política de senha ---
    it('deve rejeitar senha com menos de 8 caracteres', async () => {
      const data = { ...inputData, password: 'Ab@1234' };
      await expect(userService.register(data)).rejects.toThrow(WeakPasswordError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar senha sem letra maiúscula', async () => {
      const data = { ...inputData, password: 'senha@12345' };
      await expect(userService.register(data)).rejects.toThrow(WeakPasswordError);
    });

    it('deve rejeitar senha sem letra minúscula', async () => {
      const data = { ...inputData, password: 'SENHA@12345' };
      await expect(userService.register(data)).rejects.toThrow(WeakPasswordError);
    });

    it('deve rejeitar senha sem caractere especial', async () => {
      const data = { ...inputData, password: 'Senha12345' };
      await expect(userService.register(data)).rejects.toThrow(WeakPasswordError);
    });

    it('deve aceitar senha que atende todos os critérios', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);
      bcrypt.hash.mockResolvedValue('hashed_password_mock');
      crypto.randomBytes.mockReturnValue({ toString: () => 'mocked_token_hex' });
      userRepository.create.mockResolvedValue({ id: 'uuid-mock', email: inputData.email });

      await expect(userService.register(inputData)).resolves.toBeDefined();
    });

    // --- Envio de e-mail de verificação ---
    it('deve disparar o envio do e-mail de verificação após o cadastro', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined);
      bcrypt.hash.mockResolvedValue('hashed_password_mock');
      crypto.randomBytes.mockReturnValue({ toString: () => 'mocked_token_hex' });
      userRepository.create.mockResolvedValue({ id: 'uuid-mock', email: inputData.email });

      await userService.register(inputData);

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        inputData.email,
        'mocked_token_hex'
      );
    });
  });

  describe('verifyEmail', () => {
    it('deve verificar o e-mail quando o token é válido e não expirado', async () => {
      userRepository.findByVerificationToken.mockResolvedValue({
        id: 'uuid-mock',
        verification_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
      });

      await userService.verifyEmail('token-valido');

      expect(userRepository.markEmailAsVerified).toHaveBeenCalledWith('uuid-mock');
    });

    it('deve rejeitar quando o token não existe', async () => {
      userRepository.findByVerificationToken.mockResolvedValue(undefined);

      await expect(userService.verifyEmail('token-invalido')).rejects.toThrow(
        InvalidOrExpiredTokenError
      );
      expect(userRepository.markEmailAsVerified).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando o token já expirou', async () => {
      userRepository.findByVerificationToken.mockResolvedValue({
        id: 'uuid-mock',
        verification_token_expires_at: new Date(Date.now() - 60 * 1000),
      });

      await expect(userService.verifyEmail('token-expirado')).rejects.toThrow(
        InvalidOrExpiredTokenError
      );
      expect(userRepository.markEmailAsVerified).not.toHaveBeenCalled();
    });
  });
});