const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

const { Resend } = require('resend');
const emailService = require('../../src/services/email.service');

// Nota: o SDK do Resend não lança exceção em falhas da API — retorna { data, error }
const SDK_SUCCESS = { data: { id: 'email-mock-id' }, error: null };
const SDK_FAILURE = {
  data: null,
  error: { name: 'validation_error', message: 'You can only send testing emails to your own email address.' },
};

describe.each([
  ['sendVerificationEmail', 'token-abc123', 'Falha ao enviar e-mail de verificação'],
  ['sendPasswordResetEmail', 'reset-token-abc123', 'Falha ao enviar e-mail de redefinição de senha'],
])('EmailService.%s', (method, token, failureLabel) => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('deve enviar o e-mail com o link correto', async () => {
    mockSend.mockResolvedValue(SDK_SUCCESS);

    await emailService[method]('joao@example.com', token);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'joao@example.com',
        subject: expect.any(String),
        html: expect.stringContaining(token),
      })
    );
  });

  it('não deve registrar erro quando o envio for bem-sucedido', async () => {
    mockSend.mockResolvedValue(SDK_SUCCESS);

    await emailService[method]('joao@example.com', token);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('deve registrar a falha quando a API do Resend retornar error sem lançar exceção', async () => {
    mockSend.mockResolvedValue(SDK_FAILURE);

    await expect(emailService[method]('joao@example.com', token)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(`${failureLabel}:`, SDK_FAILURE.error.message);
  });

  it('não deve lançar erro quando o envio for rejeitado (resiliência)', async () => {
    mockSend.mockRejectedValue(new Error('Resend API indisponível'));

    await expect(emailService[method]('joao@example.com', token)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(`${failureLabel}:`, 'Resend API indisponível');
  });

  it('não deve lançar erro quando o cliente do Resend não puder ser criado (ex.: API key ausente)', async () => {
    Resend.mockImplementationOnce(() => {
      throw new Error('Missing API key.');
    });

    await expect(emailService[method]('joao@example.com', token)).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(`${failureLabel}:`, 'Missing API key.');
    expect(mockSend).not.toHaveBeenCalled();
  });
});
