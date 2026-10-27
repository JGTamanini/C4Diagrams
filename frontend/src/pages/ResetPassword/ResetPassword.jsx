import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import Button from '../../components/Button/Button';
import AuthItem from '../../components/AuthLayout/AuthItem';
import { useAuthIllustration } from '../../components/AuthLayout/authIllustration';

function ResetPassword() {
  useAuthIllustration('reset');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    const token = searchParams.get('token');

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      void navigate('/login');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.';
      setErrorMessage(message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthItem>
        <Brand />
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">Redefinir senha</h1>
        <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-secondary">Escolha uma nova senha para sua conta.</p>
      </AuthItem>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <AuthItem className="flex flex-col">
          <FormInput
            id="newPassword"
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mb-2"
          />
          <p className="mb-6 text-xs text-text-muted">Mínimo 8 caracteres, com maiúscula, minúscula e caractere especial.</p>
        </AuthItem>
        <AuthItem>
          <Button type="submit" loading={submitting} className="w-full">
            Redefinir senha
          </Button>
        </AuthItem>
      </form>

      {errorMessage && (
        <p role="alert" className="mt-4 text-center text-sm text-danger">
          {errorMessage}
        </p>
      )}
    </>
  );
}

export default ResetPassword;
