import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../services/api';
import { saveSession } from '../../services/session';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import Button from '../../components/Button/Button';
import AuthItem from '../../components/AuthLayout/AuthItem';
import { useAuthIllustration } from '../../components/AuthLayout/authIllustration';

const JWT_FORMAT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function Login() {
  useAuthIllustration('login');
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = Boolean(location.state?.sessionExpired);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      if (!JWT_FORMAT_REGEX.test(token)) {
        throw new Error('Token inválido recebido do servidor.');
      }

      saveSession(token, user);
      void navigate('/projetos');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Erro ao entrar. Tente novamente.';
      setErrorMessage(message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthItem>
        <Brand />
        <h1 className="mb-2 text-3xl font-semibold text-text-primary">Entrar</h1>
        <p className="mb-8 text-sm text-text-secondary">Continue de onde parou.</p>
      </AuthItem>

      {sessionExpired && (
        <AuthItem>
          <output className="mb-6 block rounded-[var(--radius-control)] border border-line bg-surface-raised px-3 py-2 text-sm text-text-secondary">
            Sua sessão expirou. Faça login novamente.
          </output>
        </AuthItem>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col">
        <AuthItem className="flex flex-col">
          <FormInput id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4" />
        </AuthItem>
        <AuthItem className="flex flex-col">
          <FormInput id="password" label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2" />
          <div className="mb-6 text-right">
            <Link to="/forgot-password" className="text-link text-sm">
              Esqueci minha senha
            </Link>
          </div>
        </AuthItem>
        <AuthItem>
          <Button type="submit" loading={submitting} className="mb-6 w-full">
            Entrar
          </Button>
        </AuthItem>
      </form>

      {errorMessage && (
        <p role="alert" className="mb-4 text-center text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <AuthItem>
        <p className="text-center text-sm text-text-secondary">
          Não tem conta?{' '}
          <Link to="/cadastro" className="text-link">
            Cadastre-se
          </Link>
        </p>
      </AuthItem>
    </>
  );
}

export default Login;
