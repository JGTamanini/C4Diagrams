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

// Visual dos e-mails (opção B, "papel claro"): botão com o link completo e, abaixo, um link alternativo curto, sem o
// token à vista; a versão em texto puro leva o link inteiro (texto puro não tem link clicável)
describe('EmailService — conteúdo dos e-mails', () => {
  const previousUrl = process.env.FRONTEND_URL;
  const token = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://c4diagrams.com.br';
    mockSend.mockResolvedValue(SDK_SUCCESS);
  });

  afterAll(() => {
    process.env.FRONTEND_URL = previousUrl;
  });

  const sent = () => mockSend.mock.calls[0][0];
  const visibleText = (html) => html.replace(/href="[^"]*"/g, '');

  it.each([
    [
      'sendVerificationEmail',
      'Confirme seu e-mail — C4Diagrams',
      'Confirmar e-mail',
      'verify-email',
      '24 horas',
      'criou uma conta no C4Diagrams',
    ],
    [
      'sendPasswordResetEmail',
      'Redefinição de senha — C4Diagrams',
      'Criar nova senha',
      'reset-password',
      '10 minutos',
      'sua senha continua a mesma',
    ],
  ])('%s: botão, link alternativo curto, validade, rodapé e versão em texto', async (method, subject, button, path, expiry, footer) => {
    await emailService[method]('joao@example.com', token);
    const link = `https://c4diagrams.com.br/${path}?token=${token}`;
    const { html, text } = sent();

    expect(sent().subject).toBe(subject);
    expect(html).toContain(`href="${link}"`);
    expect(html).toContain(button);
    expect(html).toContain(`>c4diagrams.com.br/${path}</a>`);
    expect(visibleText(html)).not.toContain(token);
    expect(html).toContain(expiry);
    expect(html).toContain(footer);
    expect(html).toContain('C4//diagrams');

    expect(text).toContain(link);
    expect(text).toContain(expiry);
    expect(text).not.toContain('<');
  });
});
