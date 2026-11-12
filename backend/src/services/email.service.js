const { Resend } = require('resend');
const { renderEmail } = require('./emailTemplate');

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Nota: o SDK do Resend não lança exceção em falhas da API — retorna { data, error }.
// Sem checar o error, recusas (ex.: domínio não verificado) ficariam silenciosas em produção.
// Falha de e-mail nunca derruba o fluxo que a disparou (cadastro/recuperação), só é registrada.
async function sendEmail(message, failureLabel) {
  try {
    const { error } = await getResendClient().emails.send({ from: process.env.EMAIL_FROM, ...message });

    if (error) {
      console.error(`${failureLabel}:`, error.message);
    }
  } catch (err) {
    console.error(`${failureLabel}:`, err.message);
  }
}

async function sendVerificationEmail(email, token) {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await sendEmail(
    {
      to: email,
      subject: 'Confirme seu e-mail — C4Diagrams',
      ...renderEmail({
        title: 'Confirme seu e-mail',
        lead: 'Falta um passo para começar a modelar sua arquitetura no C4Diagrams: confirme que este e-mail é seu.',
        buttonLabel: 'Confirmar e-mail',
        link: verificationLink,
        expiry: 'O link vale por 24 horas.',
        footer: 'Você recebeu este e-mail porque criou uma conta no C4Diagrams. Se não foi você, é só ignorar: nada será ativado.',
      }),
    },
    'Falha ao enviar e-mail de verificação'
  );
}

async function sendPasswordResetEmail(email, token) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await sendEmail(
    {
      to: email,
      subject: 'Redefinição de senha — C4Diagrams',
      ...renderEmail({
        title: 'Redefina sua senha',
        lead: 'Recebemos um pedido para redefinir a senha da sua conta no C4Diagrams.',
        buttonLabel: 'Criar nova senha',
        link: resetLink,
        expiry: 'O link vale por 10 minutos.',
        footer: 'Se você não pediu a redefinição, ignore este e-mail: sua senha continua a mesma.',
      }),
    },
    'Falha ao enviar e-mail de redefinição de senha'
  );
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
