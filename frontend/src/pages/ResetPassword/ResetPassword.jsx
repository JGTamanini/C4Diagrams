import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import DiagramIllustration from '../../components/DiagramIllustration/DiagramIllustration';
import AuthCard from '../../components/AuthCard/AuthCard';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import PrimaryButton from '../../components/PrimaryButton/PrimaryButton';
import { NODE_TYPES } from '../../constants/diagramNodeTypes';

const resetNodes = [
  { x: 75, y: 0, label: 'Person', sublabel: 'Usuário', ...NODE_TYPES.person },
  { x: 75, y: 75, label: 'Database', sublabel: '[Container]', ...NODE_TYPES.database },
];

const resetConnections = [{ x1: 128, y1: 45, x2: 128, y2: 80, color: 'var(--color-line)' }];

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
      <AuthCard>
        <Brand />

        <h1 className="mb-2 text-2xl font-medium text-text-primary">Redefinir senha</h1>
        <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-secondary">
          Escolha uma nova senha para sua conta.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-1">
          <FormInput id="newPassword" label="Nova senha" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mb-2" />
          <p className="mb-6 text-xs text-text-muted">
            Mínimo 8 caracteres, com maiúscula, minúscula e caractere especial.
          </p>

          <PrimaryButton className="">Redefinir senha</PrimaryButton>
        </form>

        {errorMessage && (
          <p role="alert" className="mt-4 text-center text-sm text-danger">
            {errorMessage}
          </p>
        )}
      </AuthCard>

      <DiagramIllustration nodes={resetNodes} connections={resetConnections} />
    </div>
  );
}

export default ResetPassword;