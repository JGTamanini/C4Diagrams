const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const emailService = require('../../src/services/email.service');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('deve enviar o e-mail com o link de verificação correto', async () => {
      mockSend.mockResolvedValue({ id: 'email-mock-id' });

      await emailService.sendVerificationEmail('joao@example.com', 'token-abc123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@example.com',
          subject: expect.any(String),
          html: expect.stringContaining('token-abc123'),
        })
      );
    });

    it('não deve lançar erro quando o envio falha (resiliência)', async () => {
      mockSend.mockRejectedValue(new Error('Resend API indisponível'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        emailService.sendVerificationEmail('joao@example.com', 'token-abc123')
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('deve enviar o e-mail com o link de redefinição correto', async () => {
      mockSend.mockResolvedValue({ id: 'email-mock-id' });

      await emailService.sendPasswordResetEmail('joao@example.com', 'reset-token-abc123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@example.com',
          subject: expect.any(String),
          html: expect.stringContaining('reset-token-abc123'),
        })
      );
    });

    it('não deve lançar erro quando o envio falha (resiliência)', async () => {
      mockSend.mockRejectedValue(new Error('Resend API indisponível'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        emailService.sendPasswordResetEmail('joao@example.com', 'reset-token-abc123')
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});