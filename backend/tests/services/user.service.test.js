jest.mock('../../src/repositories/user.repository');
jest.mock('bcryptjs');
jest.mock('crypto');

const userRepository = require('../../src/repositories/user.repository');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userService = require('../../src/services/user.service');
const { EmailAlreadyExistsError } = require('../../src/errors/user.errors');

describe('UserService', () => {
  const inputData = {
    name: 'João Tamanini',
    email: 'joao@example.com',
    password: 'senha12345',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('deve registrar um usuário com senha hasheada e token de verificação', async () => {
      userRepository.findByEmail.mockResolvedValue(undefined); // e-mail livre
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

    it('deve rejeitar senha com menos de 8 caracteres', async () => {
      const weakPasswordData = { ...inputData, password: '1234567' };

      await expect(userService.register(weakPasswordData)).rejects.toThrow();
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });
});