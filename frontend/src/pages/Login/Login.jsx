import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';

const loginNodes = [
  { x: 70, y: 0, label: 'API', sublabel: '[Container]', ...NODE_TYPES.container },
  { x: 0, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
  { x: 140, y: 75, label: 'Serviço IA', sublabel: '[Externo]', ...NODE_TYPES.external },
];

const loginConnections = [
  { x1: 95, y1: 45, x2: 60, y2: 80, color: 'var(--color-line)' },
  { x1: 145, y1: 45, x2: 190, y2: 80, color: 'var(--color-line)' },
];

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const JWT_FORMAT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

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
      <div className="flex items-center justify-center px-8 py-16 md:px-16">
        <div className="relative z-10 w-full max-w-lg rounded-xl border border-line bg-surface/90 p-10 shadow-2xl shadow-black/50">
          <span className="mb-10 block font-mono text-sm font-medium text-text-primary">C4//diagrams</span>

          <h1 className="mb-2 text-3xl font-medium text-text-primary">Entrar</h1>
          <p className="mb-8 text-sm text-text-secondary">Continue de onde parou.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <label htmlFor="email" className="mb-1 text-sm text-text-secondary">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-4 h-11 rounded-md border border-line bg-canvas-deep px-3 text-text-primary outline-none focus:border-accent"
            />

            <label htmlFor="password" className="mb-1 text-sm text-text-secondary">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-2 h-11 rounded-md border border-line bg-canvas-deep px-3 text-text-primary outline-none focus:border-accent"
            />

            <div className="mb-6 text-right">
              <Link to="/forgot-password" className="text-sm text-accent">
                Esqueci minha senha
              </Link>
            </div>

            <button
              type="submit"
              className="mb-6 rounded-md bg-accent py-3 text-sm font-medium text-accent-fg"
            >
              Entrar
            </button>
          </form>

          {errorMessage && (
            <p role="alert" className="mt-4 text-center text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      <DiagramIllustration nodes={loginNodes} connections={loginConnections} />
    </div>
  );
}

export default Login;