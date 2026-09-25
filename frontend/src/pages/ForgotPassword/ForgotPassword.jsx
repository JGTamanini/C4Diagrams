import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
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
        <div className="flex items-center justify-center px-8 py-16 md:px-16">
          <div className="w-full max-w-lg rounded-xl border border-line bg-surface/90 p-10 shadow-2xl shadow-black/50">
            <span className="mb-10 block font-mono text-sm font-medium text-text-primary">C4//diagrams</span>

            <div className="mb-6 flex h-13 w-13 items-center justify-center rounded-lg border border-success bg-success/10">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="mb-2 text-2xl font-medium text-text-primary">Verifique seu e-mail</h1>
            <output className="max-w-sm text-sm leading-relaxed text-text-secondary">
              {successMessage}
            </output>
          </div>
        </div>

        <DiagramIllustration nodes={formNodes} connections={formConnections} />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
      <div className="flex items-center justify-center px-8 py-16 md:px-16">
        <div className="w-full max-w-lg rounded-xl border border-line bg-surface/90 p-10 shadow-2xl shadow-black/50">
          <span className="mb-10 block font-mono text-sm font-medium text-text-primary">C4//diagrams</span>

          <h1 className="mb-2 text-2xl font-medium text-text-primary">Esqueci minha senha</h1>
          <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-secondary">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

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
              className="mb-6 h-11 rounded-md border border-line bg-canvas-deep px-3 text-text-primary outline-none focus:border-accent"
            />

            <button
              type="submit"
              className="mb-6 rounded-md bg-accent py-3 text-sm font-medium text-accent-fg"
            >
              Enviar link de recuperação
            </button>
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
        </div>
      </div>

      <DiagramIllustration nodes={formNodes} connections={formConnections} />
    </div>
  );
}

export default ForgotPassword;