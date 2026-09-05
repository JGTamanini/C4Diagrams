const { Resend } = require('resend');

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendVerificationEmail(email, token) {
  const resend = getResendClient();
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Confirme seu e-mail — C4Diagrams',
      html: `
        <p>Olá!</p>
        <p>Clique no link abaixo para confirmar seu e-mail:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
        <p>Este link expira em 24 horas.</p>
      `,
    });
  } catch (err) {
    console.error('Falha ao enviar e-mail de verificação:', err.message);
  }
}

module.exports = { sendVerificationEmail };