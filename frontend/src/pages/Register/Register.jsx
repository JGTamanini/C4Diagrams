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

const registerNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Novo usuário', ...NODE_TYPES.person },
  { x: 10, y: 75, label: 'Web App', sublabel: '[Container]', ...NODE_TYPES.container },
  { x: 140, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
];

const registerConnections = [
  { x1: 100, y1: 45, x2: 65, y2: 80, color: 'var(--color-line)' },
  { x1: 150, y1: 45, x2: 195, y2: 80, color: 'var(--color-line)' },
];

const emailSentNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Novo usuário', ...NODE_TYPES.person },
  { x: 75, y: 75, label: 'Serviço e-mail', sublabel: '[Externo]', ...NODE_TYPES.emailService },
];

const emailSentConnections = [{ x1: 128, y1: 45, x2: 128, y2: 80, color: 'var(--color-success)' }];

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.post('/auth/register', { name, email, password });
      setSuccessMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao cadastrar. Tente novamente.';
      setErrorMessage(message);
    }
  }

  if (successMessage) {
    return (
      <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
        <AuthCard>
          <EmailConfirmationCard message={successMessage} />
        </AuthCard>
        <DiagramIllustration nodes={emailSentNodes} connections={emailSentConnections} />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
      <AuthCard>
        <Brand className="mb-8" />

        <h1 className="mb-2 text-2xl font-medium text-text-primary">Criar conta</h1>
        <p className="mb-6 text-sm text-text-secondary">Comece a modelar em poucos minutos.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <FormInput id="name" label="Nome" value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
          <FormInput id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3" />
          <FormInput id="password" label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-5" />

          <PrimaryButton className="mb-5">Cadastrar</PrimaryButton>
        </form>

        {errorMessage && (
          <p role="alert" className="mb-4 text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <p className="text-center text-sm text-text-secondary">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-accent">
            Entrar
          </Link>
        </p>
      </AuthCard>

      <DiagramIllustration nodes={registerNodes} connections={registerConnections} />
    </div>
  );
}

export default Register;