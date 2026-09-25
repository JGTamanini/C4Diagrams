import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import AuthCard from '../../components/AuthCard/AuthCard';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';

const loginNodes = [
  { x: 70, y: 0, label: 'API', sublabel: '[Container]', ...NODE_TYPES.container },
  { x: 0, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
  { x: 140, y: 75, label: 'Serviço IA', sublabel: '[Externo]', ...NODE_TYPES.external },
];

const loginConnections = [
  { x1: 95, y1: 45, x2: 60, y2: 80, color: 'var(--color-line)' },
  { x1: 145, y1: 45, x2: 190, y2: 80, color: 'var(--color-line)' },
];

const JWT_FORMAT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;

      if (!JWT_FORMAT_REGEX.test(token)) {
        throw new Error('Token inválido recebido do servidor.');
      }

      localStorage.setItem('token', token);
      navigate('/canvas-test');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Erro ao entrar. Tente novamente.';
      setErrorMessage(message);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
      <AuthCard>
        <Brand />

        <h1 className="mb-2 text-3xl font-medium text-text-primary">Entrar</h1>
        <p className="mb-8 text-sm text-text-secondary">Continue de onde parou.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <FormInput id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4" />
          <FormInput id="password" label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2" />

          <div className="mb-6 text-right">
            <Link to="/forgot-password" className="text-sm text-accent">
              Esqueci minha senha
            </Link>
          </div>

          <PrimaryButton>Entrar</PrimaryButton>
        </form>

        {errorMessage && (
          <p role="alert" className="mb-4 text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <p className="text-center text-sm text-text-secondary">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-accent">
            Cadastre-se
          </Link>
        </p>
      </AuthCard>

      <DiagramIllustration nodes={loginNodes} connections={loginConnections} />
    </div>
  );
}

export default Login;