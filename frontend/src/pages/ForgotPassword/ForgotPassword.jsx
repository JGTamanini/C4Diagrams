import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import AuthCard from '../../components/AuthCard/AuthCard';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import EmailConfirmationCard from '../../components/EmailConfirmationCard/EmailConfirmationCard';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';

const formNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Usuário', ...NODE_TYPES.person },
  { x: 75, y: 75, label: 'Serviço e-mail', sublabel: '[Externo]', ...NODE_TYPES.emailService },
];

const formConnections = [{ x1: 128, y1: 45, x2: 128, y2: 80, color: 'var(--color-success)' }];

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(response.data.message);
    } catch {
      setErrorMessage('Ocorreu um erro. Tente novamente.');
    }
  }

  if (successMessage) {
    return (
      <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
        <AuthCard>
          <EmailConfirmationCard message={successMessage} />
        </AuthCard>
        <DiagramIllustration nodes={formNodes} connections={formConnections} />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
      <AuthCard>
        <Brand />

        <h1 className="mb-2 text-2xl font-medium text-text-primary">Esqueci minha senha</h1>
        <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-secondary">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <FormInput id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-6" />
          <PrimaryButton>Enviar link de recuperação</PrimaryButton>
        </form>

        {errorMessage && (
          <p role="alert" className="mb-4 text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <p className="text-center text-sm">
          <Link to="/login" className="text-accent">
            Voltar ao login
          </Link>
        </p>
      </AuthCard>

      <DiagramIllustration nodes={formNodes} connections={formConnections} />
    </div>
  );
}

export default ForgotPassword;