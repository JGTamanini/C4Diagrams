const { Resend } = require('resend');

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
      html: `
        <p>Olá!</p>
        <p>Clique no link abaixo para confirmar seu e-mail:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>Este link expira em 24 horas.</p>
      `,
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
      html: `
        <p>Olá!</p>
        <p>Recebemos um pedido para redefinir sua senha. Clique no link abaixo:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Este link expira em 10 minutos. Se você não solicitou isso, ignore este e-mail.</p>
      `,
    },
    'Falha ao enviar e-mail de redefinição de senha'
  );
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
