import { useState } from 'react';
import api from '../../services/api';
import FormInput from '../FormInput/FormInput';

// Nota: com e-mail conhecido (pós-cadastro) mostra só o botão; sem ele (link inválido/expirado) pede o e-mail
function ResendVerification({ email: knownEmail }) {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setSending(true);

    try {
      const response = await api.post('/auth/resend-verification', { email: knownEmail ?? email });
      setStatusMessage(response.data.message);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Não foi possível reenviar o link. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex w-full max-w-xs flex-col gap-1 text-left">
      {!knownEmail && (
        <FormInput
          id="resend-email"
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3"
        />
      )}

      <button
        type="submit"
        disabled={sending}
        className="self-center text-sm text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {knownEmail ? 'Não recebeu? Reenviar' : 'Reenviar link'}
      </button>

      {statusMessage && (
        <output className="mt-3 text-center text-sm text-text-secondary">{statusMessage}</output>
      )}
      {errorMessage && (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

export default ResendVerification;
