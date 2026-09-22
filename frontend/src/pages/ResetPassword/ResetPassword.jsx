import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';

const resetNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Usuário', borderColor: '#F0F6FC', labelColor: '#F0F6FC' },
  { x: 75, y: 75, label: 'Database', sublabel: '[Container]', borderColor: '#3FB950', labelColor: '#3FB950' },
];

const resetConnections = [{ x1: 128, y1: 45, x2: 128, y2: 80, color: '#30363D' }];

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    const token = searchParams.get('token');

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      navigate('/login');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.';
      setErrorMessage(message);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
      <div className="flex items-center justify-center px-8 py-16 md:px-16">
        <div className="w-full max-w-lg rounded-xl border border-line bg-surface/90 p-10 shadow-2xl shadow-black/50">
          <span className="mb-10 block font-mono text-sm font-medium text-text-primary">C4//diagrams</span>

          <h1 className="mb-2 text-2xl font-medium text-text-primary">Redefinir senha</h1>
          <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-secondary">
            Escolha uma nova senha para sua conta.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <label htmlFor="newPassword" className="mb-1 text-sm text-text-secondary">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mb-2 h-11 rounded-md border border-line bg-canvas-deep px-3 text-text-primary outline-none focus:border-accent"
            />
            <p className="mb-6 text-xs text-text-muted">
              Mínimo 8 caracteres, com maiúscula, minúscula e caractere especial.
            </p>

            <button
              type="submit"
              className="rounded-md bg-accent py-3 text-sm font-medium text-accent-fg"
            >
              Redefinir senha
            </button>
          </form>

          {errorMessage && (
            <p role="alert" className="mt-4 text-center text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </div>
      </div>

      <DiagramIllustration nodes={resetNodes} connections={resetConnections} />
    </div>
  );
}

export default ResetPassword;